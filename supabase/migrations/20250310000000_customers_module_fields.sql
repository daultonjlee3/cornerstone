-- Customers module: add contact_name, customer_type, billing_city/state/zip, active
-- Table public.customers already exists (company_id, property_id, name, email, phone, billing_address, notes, created_at, updated_at).
-- This migration adds the remaining fields required for the Customer model.

-- ---------------------------------------------------------------------------
-- Add columns if not present
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS customer_type text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Set default for existing rows
UPDATE public.customers SET active = true WHERE active IS NULL;

-- Enforce customer_type enum and default
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS chk_customers_customer_type;
ALTER TABLE public.customers ADD CONSTRAINT chk_customers_customer_type
  CHECK (customer_type IS NULL OR customer_type IN ('tenant', 'owner', 'external'));

-- Optional: set default for new rows (nullable to allow backfill)
-- ALTER TABLE public.customers ALTER COLUMN customer_type SET DEFAULT 'external';

-- Indexes on company_id and property_id already exist in initial schema (idx_customers_company_id, idx_customers_property_id).
-- No additional indexes required for this change.
