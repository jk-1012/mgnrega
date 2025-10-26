import os
import requests
from datetime import datetime, date
from .celery import celery_app
from .database import SessionLocal
from . import crud, models
import time
import logging

logger = logging.getLogger(__name__)

# API Configuration
MGNREGA_BASE = os.getenv("MGNREGA_BASE_URL", "https://api.data.gov.in/resource/")
API_KEY = os.getenv("DATA_GOV_API_KEY", "")

def normalize_item(raw, district_code, year_month_str):
    """
    Normalize API response to internal schema.
    Adapt this based on actual API response structure.
    """
    try:
        # Handle different response structures
        if isinstance(raw, dict):
            records = raw.get("records", [])
            if records:
                doc = records[0]
            else:
                # Try direct fields
                doc = raw
        else:
            doc = {}

        # Parse year_month
        try:
            ym = datetime.strptime(year_month_str, "%Y-%m").date()
        except:
            ym = date.today().replace(day=1)

        return {
            "district_code": district_code,
            "year_month": ym,
            "total_work_days": int(doc.get("total_work_days") or doc.get("persondays_generated") or 0),
            "households_worked": int(doc.get("households_worked") or doc.get("total_households") or 0),
            "people_benefitted": int(doc.get("people_benefitted") or doc.get("total_persons_worked") or 0),
            "total_payments": float(doc.get("total_payments") or doc.get("total_exp") or 0.0),
            "source_updated_at": datetime.utcnow()
        }
    except Exception as e:
        logger.exception(f"Normalization error for {district_code}: {e}")
        return None

@celery_app.task(bind=True, max_retries=5, default_retry_delay=60)
def fetch_and_store(self, district_code: str, year_month: str):
    """
    Fetch MGNREGA data for a district and month, store in DB.

    Args:
        district_code: District code (e.g., "0901")
        year_month: Year-month string (e.g., "2025-09")
    """
    # Construct API URL (adapt to actual API endpoint)
    url = f"{MGNREGA_BASE}{district_code}?year_month={year_month}&api-key={API_KEY}&format=json"

    try:
        logger.info(f"Fetching data for {district_code}, {year_month}")
        resp = requests.get(url, timeout=30)

        # Handle rate limiting
        if resp.status_code == 429:
            logger.warning(f"Rate limited for {district_code}")
            raise Exception("Rate limited")

        resp.raise_for_status()
        raw = resp.json()

        # Normalize and store
        normalized = normalize_item(raw, district_code, year_month)
        if not normalized:
            logger.error(f"Failed to normalize data for {district_code}")
            return {"ok": False, "error": "normalization_failed"}

        db = SessionLocal()
        try:
            # Store raw data
            crud.store_raw(db, district_code, normalized['year_month'], raw)

            # Upsert monthly metrics
            obj = crud.upsert_monthly(db, normalized)

            logger.info(f"Successfully stored data for {district_code}, {year_month}")
            return {
                "ok": True,
                "district": district_code,
                "year_month": year_month,
                "metrics": {
                    "people_benefitted": normalized['people_benefitted'],
                    "total_work_days": normalized['total_work_days']
                }
            }
        finally:
            db.close()

    except Exception as exc:
        logger.exception(f"Error fetching {district_code}: {exc}")
        # Exponential backoff
        countdown = min(60 * (2 ** self.request.retries), 3600)
        raise self.retry(exc=exc, countdown=countdown)

@celery_app.task
def refresh_all_districts():
    """
    Refresh data for all districts (called by beat scheduler).
    """
    db = SessionLocal()
    try:
        districts = crud.get_districts(db, limit=5000)
        current_month = date.today().replace(day=1).strftime("%Y-%m")

        for district in districts:
            # Queue fetch task for current month
            fetch_and_store.delay(district.district_code, current_month)
            time.sleep(0.1)  # Small delay to avoid overwhelming queue

        return {"ok": True, "queued": len(districts)}
    finally:
        db.close()

@celery_app.task
def bulk_backfill(district_code: str, start_month: str, end_month: str):
    """
    Backfill historical data for a district.

    Args:
        district_code: District code
        start_month: Start month (YYYY-MM)
        end_month: End month (YYYY-MM)
    """
    from dateutil.rrule import rrule, MONTHLY
    from datetime import datetime

    start = datetime.strptime(start_month, "%Y-%m")
    end = datetime.strptime(end_month, "%Y-%m")

    months = []
    for dt in rrule(MONTHLY, dtstart=start, until=end):
        months.append(dt.strftime("%Y-%m"))

    for month in months:
        fetch_and_store.delay(district_code, month)
        time.sleep(0.5)  # Rate limiting

    return {"ok": True, "queued_months": len(months)}