import os
from fastapi import FastAPI, HTTPException, Depends, Query
from . import database, models, crud, schemas
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import redis
import json
import requests
from typing import Optional

models.Base.metadata.create_all(bind=database.engine, checkfirst=True)

app = FastAPI(title="MGNREGA-OurVoice API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis cache
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
try:
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
except:
    r = None

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/v1/ping")
def ping():
    return {
        "status": "ok",
        "time": datetime.utcnow().isoformat(),
        "cache": "connected" if r else "disconnected"
    }

@app.get("/api/v1/districts")
def list_districts(db: Session = Depends(get_db)):
    """Get all districts."""
    items = crud.get_districts(db, limit=5000)
    return [{
        "district_code": d.district_code,
        "district_name_en": d.district_name_en,
        "district_name_hi": d.district_name_hi,
        "state": d.state
    } for d in items]

@app.get("/api/v1/districts/{code}/summary")
def district_summary(code: str, db: Session = Depends(get_db)):
    """Get latest summary for a district."""
    cache_key = f"summary:{code}"

    # Try cache first
    if r:
        cached = r.get(cache_key)
        if cached:
            data = json.loads(cached)
            data['source'] = 'cached'
            return data

    # Get from DB
    d = crud.get_district_by_code(db, code)
    if not d:
        raise HTTPException(status_code=404, detail="District not found")

    latest = crud.get_latest_snapshot(db, code)
    if not latest:
        return {
            "district_code": code,
            "district_name_en": d.district_name_en,
            "district_name_hi": d.district_name_hi,
            "message": "No data available yet"
        }

    out = {
        "district_code": code,
        "district_name_en": d.district_name_en,
        "district_name_hi": d.district_name_hi,
        "state": d.state,
        "month": latest.year_month.isoformat(),
        "metrics": {
            "total_work_days": latest.total_work_days,
            "people_benefitted": latest.people_benefitted,
            "households_worked": latest.households_worked,
            "total_payments": float(latest.total_payments) if latest.total_payments is not None else None
        },
        "last_updated": latest.source_updated_at.isoformat() if latest.source_updated_at else None,
        "source": "database"
    }

    # Cache for 1 hour
    if r:
        r.set(cache_key, json.dumps(out), ex=3600)

    return out

@app.get("/api/v1/districts/{code}/trend")
def district_trend(
    code: str,
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db)
):
    """Get trend data for a district."""
    items = crud.get_trend(db, code, months)
    return [{
        "year_month": it.year_month.isoformat(),
        "total_work_days": it.total_work_days,
        "people_benefitted": it.people_benefitted,
        "households_worked": it.households_worked,
        "total_payments": float(it.total_payments) if it.total_payments is not None else None
    } for it in reversed(items)]  # Oldest to newest

@app.get("/api/v1/resolve")
def resolve_location(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """
    Reverse geocode lat/lon to find nearest district.
    Uses Nominatim (OpenStreetMap) for geocoding.
    """
    try:
        # Use Nominatim for reverse geocoding
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1,
            "zoom": 10
        }
        headers = {
            "User-Agent": "MGNREGA-OurVoice/1.0 (mgnrega@example.com)"
        }

        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # Extract district name - try multiple fields
        address = data.get("address", {})
        district_name = (
            address.get("county") or
            address.get("state_district") or
            address.get("district") or
            address.get("city_district")
        )

        state_name = address.get("state")

        if not district_name:
            return {
                "error": "Could not determine district from location",
                "address": address
            }

        # Get all districts
        districts = crud.get_districts(db, limit=5000)

        # Try exact match first (case insensitive)
        for d in districts:
            if d.district_name_en and district_name.lower() == d.district_name_en.lower():
                return {
                    "district_code": d.district_code,
                    "district_name_en": d.district_name_en,
                    "district_name_hi": d.district_name_hi,
                    "state": d.state,
                    "detected_name": district_name,
                    "match_type": "exact"
                }

        # Try partial match
        for d in districts:
            if d.district_name_en:
                # Check if detected name is in district name or vice versa
                if (district_name.lower() in d.district_name_en.lower() or
                    d.district_name_en.lower() in district_name.lower()):
                    return {
                        "district_code": d.district_code,
                        "district_name_en": d.district_name_en,
                        "district_name_hi": d.district_name_hi,
                        "state": d.state,
                        "detected_name": district_name,
                        "match_type": "partial"
                    }

        # Try matching by state if available
        if state_name:
            state_districts = [d for d in districts if d.state and state_name.lower() in d.state.lower()]
            if state_districts:
                # Return first district in that state as fallback
                d = state_districts[0]
                return {
                    "district_code": d.district_code,
                    "district_name_en": d.district_name_en,
                    "district_name_hi": d.district_name_hi,
                    "state": d.state,
                    "detected_name": district_name,
                    "match_type": "state_fallback",
                    "note": f"Detected {district_name} in {state_name}, showing first available district"
                }

        return {
            "error": "District not found in database",
            "detected_name": district_name,
            "state": state_name,
            "hint": "Please search manually from the list"
        }

    except requests.RequestException as e:
        return {
            "error": "Geocoding service unavailable",
            "details": str(e)
        }
    except Exception as e:
        return {
            "error": "Geocoding failed",
            "details": str(e)
        }

@app.get("/api/v1/stats/national")
def national_stats(db: Session = Depends(get_db)):
    """Get aggregated national statistics."""
    # This would require aggregation queries
    # Placeholder for now
    return {
        "total_districts": db.query(models.District).count(),
        "message": "National aggregation not implemented yet"
    }

@app.post("/api/v1/admin/trigger-refresh/{code}")
def trigger_refresh(code: str, year_month: Optional[str] = None, db: Session = Depends(get_db)):
    """Manually trigger data refresh for a district (admin endpoint)."""
    from .tasks import fetch_and_store
    from datetime import date

    d = crud.get_district_by_code(db, code)
    if not d:
        raise HTTPException(status_code=404, detail="District not found")

    if not year_month:
        year_month = date.today().replace(day=1).strftime("%Y-%m")

    # Queue task
    task = fetch_and_store.delay(code, year_month)

    return {
        "task_id": task.id,
        "district": code,
        "year_month": year_month,
        "status": "queued"
    }