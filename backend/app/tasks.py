import os
from celery import Celery
import requests
from datetime import datetime, date
from .database import SessionLocal
from . import crud
import time
import logging

CELERY_BROKER = os.getenv("CELERY_BROKER", "redis://redis:6379/0")
app = Celery('tasks', broker=CELERY_BROKER)

# Example base URL (replace with actual data.gov.in API endpoint with key if available)
MGNREGA_BASE = os.getenv("MGNREGA_BASE", "https://api.data.gov.in/resource/REPLACE_THIS?format=json&filters[state_name]=Uttar%20Pradesh&district_code={code}&year_month={ym}&api-key={api_key}")
API_KEY = os.getenv("DATA_GOV_API_KEY", "")

def normalize_item(raw):
    # THIS FUNCTION should be adapted to the exact schema returned by the API
    # Example placeholders:
    try:
        doc = raw.get("records", [])[0] if isinstance(raw, dict) else {}
        return {
            "district_code": doc.get("district_code") or raw.get("district_code"),
            "year_month": datetime.strptime(doc.get("year_month"), "%Y-%m").date() if doc.get("year_month") else date.today().replace(day=1),
            "total_work_days": int(doc.get("total_work_days") or 0),
            "households_worked": int(doc.get("households_worked") or 0),
            "people_benefitted": int(doc.get("people_benefitted") or 0),
            "total_payments": float(doc.get("total_payments") or 0.0),
            "source_updated_at": datetime.utcnow()
        }
    except Exception as e:
        logging.exception("normalize error")
        return None

@app.task(bind=True, max_retries=5)
def fetch_and_store(self, district_code: str, year_month: str):
    # year_month example: '2025-09' -> pass month
    url = MGNREGA_BASE.format(code=district_code, ym=year_month, api_key=API_KEY)
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 429:
            raise Exception("Rate limited")
        resp.raise_for_status()
        raw = resp.json()
        nm = normalize_item(raw)
        db = SessionLocal()
        db_raw = crud.store_raw(db, district_code, nm['year_month'], raw)
        obj = crud.upsert_monthly(db, nm)
        db.close()
        return {"ok": True, "district": district_code, "ym": year_month}
    except Exception as exc:
        countdown = min(60 * (2 ** self.request.retries), 3600)
        raise self.retry(exc=exc, countdown=countdown)
