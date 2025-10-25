import os
from fastapi import FastAPI, HTTPException, Depends
from app import models, crud, schemas, database
from . import database, models, crud, schemas
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import redis
import json

models.Base.metadata.create_all(bind=database.engine, checkfirst=True)

app = FastAPI(title="MGNREGA-OurVoice API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# simple Redis cache
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/v1/ping")
def ping():
    return {"status":"ok", "time": datetime.utcnow().isoformat()}

@app.get("/api/v1/districts")
def list_districts(db: Session = Depends(get_db)):
    items = crud.get_districts(db, limit=5000)
    return [ {"district_code":d.district_code, "district_name_en":d.district_name_en, "district_name_hi":d.district_name_hi} for d in items ]

@app.get("/api/v1/districts/{code}/summary")
def district_summary(code: str, db: Session = Depends(get_db)):
    cache_key = f"summary:{code}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    d = crud.get_district_by_code(db, code)
    if not d:
        raise HTTPException(status_code=404, detail="District not found")
    latest = crud.get_latest_snapshot(db, code)
    if not latest:
        return {"district_code": code, "message":"No data yet"}
    out = {
        "district_code": code,
        "district_name_en": d.district_name_en,
        "district_name_hi": d.district_name_hi,
        "month": latest.year_month.isoformat(),
        "metrics": {
            "total_work_days": latest.total_work_days,
            "people_benefitted": latest.people_benefitted,
            "households_worked": latest.households_worked,
            "total_payments": float(latest.total_payments) if latest.total_payments is not None else None
        },
        "last_updated": latest.source_updated_at.isoformat() if latest.source_updated_at else None,
        "source": "cached"
    }
    r.set(cache_key, json.dumps(out), ex=60*60)  # 1 hour
    return out

@app.get("/api/v1/districts/{code}/trend")
def district_trend(code: str, months:int=12, db: Session = Depends(get_db)):
    items = crud.get_trend(db, code, months)
    return [
        {
            "year_month": it.year_month.isoformat(),
            "total_work_days": it.total_work_days,
            "people_benefitted": it.people_benefitted,
            "households_worked": it.households_worked,
            "total_payments": float(it.total_payments) if it.total_payments is not None else None
        } for it in items
    ]
