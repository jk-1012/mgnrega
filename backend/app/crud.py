from sqlalchemy.orm import Session
from . import models, schemas
from datetime import date
from sqlalchemy import select, func

def get_districts(db: Session, skip: int =0, limit:int=100):
    return db.query(models.District).offset(skip).limit(limit).all()

def get_district_by_code(db: Session, code: str):
    return db.query(models.District).filter(models.District.district_code==code).first()

def upsert_monthly(db: Session, m: dict):
    # m: {district_code, year_month, total_work_days, ...}
    # Upsert
    obj = db.query(models.DistrictMonthly).filter(
        models.DistrictMonthly.district_code==m['district_code'],
        models.DistrictMonthly.year_month==m['year_month']
    ).first()
    if not obj:
        obj = models.DistrictMonthly(**m)
        db.add(obj)
    else:
        for k,v in m.items():
            setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

def store_raw(db: Session, district_code: str, year_month: date, raw_json: dict):
    r = models.RawMgnrega(district_code=district_code, year_month=year_month, raw=raw_json)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

def get_latest_snapshot(db: Session, district_code: str):
    return db.query(models.DistrictMonthly).filter(models.DistrictMonthly.district_code==district_code).order_by(models.DistrictMonthly.year_month.desc()).first()

def get_trend(db: Session, district_code: str, months: int=12):
    q = db.query(models.DistrictMonthly).filter(models.DistrictMonthly.district_code==district_code).order_by(models.DistrictMonthly.year_month.desc()).limit(months)
    return q.all()
