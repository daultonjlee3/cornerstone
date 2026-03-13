-- Add canonical asset criticality for onboarding import mapping.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'medium';

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS chk_assets_criticality;
ALTER TABLE public.assets
  ADD CONSTRAINT chk_assets_criticality
  CHECK (criticality IN ('low', 'medium', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS idx_assets_criticality
  ON public.assets (company_id, criticality);
