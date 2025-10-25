from pydantic import BaseModel
from typing import Optional
from datetime import date

class DistrictBase(BaseModel):
    district_code: str
    district_name_en: Optional[str]
    district_name_hi: Optional[str]

class DistrictCreate(DistrictBase):
    state: str

class DistrictOut(DistrictBase):
    id: int

    class Config:
        from_attributes = True

class MonthlyMetrics(BaseModel):
    district_code: str
    year_month: date
    total_work_days: Optional[int]
    households_worked: Optional[int]
    people_benefitted: Optional[int]
    total_payments: Optional[float]
    source_updated_at: Optional[str]

    class Config:
       from_attributes = True
