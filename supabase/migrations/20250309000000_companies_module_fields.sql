-- Companies module: add legal_name, company_code, status, primary_contact_name, primary_contact_email

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS company_code text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS primary_contact_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_email text;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS chk_companies_status;

ALTER TABLE public.companies
  ADD CONSTRAINT chk_companies_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies (tenant_id, status);
