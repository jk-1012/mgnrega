-- Run on your Postgres DB
CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  state VARCHAR(100) NOT NULL,
  district_code VARCHAR(50) UNIQUE NOT NULL,
  district_name_en VARCHAR(200),
  district_name_hi VARCHAR(200)
);

CREATE TABLE raw_mgnrega (
  id SERIAL PRIMARY KEY,
  district_code VARCHAR(50) NOT NULL,
  year_month DATE NOT NULL,
  raw JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE district_monthly (
  id SERIAL PRIMARY KEY,
  district_code VARCHAR(50) NOT NULL,
  year_month DATE NOT NULL,
  total_work_days BIGINT,
  households_worked BIGINT,
  people_benefitted BIGINT,
  total_payments NUMERIC(12,2),
  source_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX district_month_uc ON district_monthly (district_code, year_month);
