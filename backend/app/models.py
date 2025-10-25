from sqlalchemy import Column, Integer, String, Date, BigInteger, Numeric, JSON, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base
from app.database import Base

class District(Base):
    __tablename__ = "districts"
    id = Column(Integer, primary_key=True)
    state = Column(String(100), nullable=False)
    district_code = Column(String(50), unique=True, nullable=False)
    district_name_en = Column(String(200))
    district_name_hi = Column(String(200))
    # optional geom if using PostGIS : geom = Column(Geometry('MULTIPOLYGON'))

class RawMgnrega(Base):
    __tablename__ = "raw_mgnrega"
    id = Column(Integer, primary_key=True)
    district_code = Column(String(50), nullable=False, index=True)
    year_month = Column(Date, nullable=False, index=True)
    raw = Column(JSON, nullable=False)
    fetched_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class DistrictMonthly(Base):
    __tablename__ = "district_monthly"
    id = Column(Integer, primary_key=True)
    district_code = Column(String(50), nullable=False, index=True)
    year_month = Column(Date, nullable=False, index=True)
    total_work_days = Column(BigInteger, nullable=True)
    households_worked = Column(BigInteger, nullable=True)
    people_benefitted = Column(BigInteger, nullable=True)
    total_payments = Column(Numeric(12, 2), nullable=True)
    source_updated_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint('district_code', 'year_month', name='_district_month_uc'),)
