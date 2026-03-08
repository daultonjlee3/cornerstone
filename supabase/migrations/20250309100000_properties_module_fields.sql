-- Properties module: add property_name, address_line1, address_line2, zip, status
-- Table public.properties already exists (company_id, name, address, city, state, postal_code, country).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_name text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Backfill from existing columns
UPDATE public.properties SET property_name = name WHERE property_name IS NULL AND name IS NOT NULL;
UPDATE public.properties SET address_line1 = address WHERE address_line1 IS NULL AND address IS NOT NULL;
UPDATE public.properties SET zip = postal_code WHERE zip IS NULL AND postal_code IS NOT NULL;

-- Ensure status is set and add constraint
UPDATE public.properties SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.properties ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS chk_properties_status;
ALTER TABLE public.properties ADD CONSTRAINT chk_properties_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties (company_id, status);
