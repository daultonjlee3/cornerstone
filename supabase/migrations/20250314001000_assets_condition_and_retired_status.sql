-- Align assets schema with frontend asset forms/listing usage.
-- Adds condition column and extends status constraint to include retired.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS condition text;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS chk_assets_condition;
ALTER TABLE public.assets ADD CONSTRAINT chk_assets_condition
  CHECK (condition IS NULL OR condition IN ('excellent', 'good', 'fair', 'poor'));

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS chk_assets_status;
ALTER TABLE public.assets ADD CONSTRAINT chk_assets_status
  CHECK (status IN ('active', 'inactive', 'retired'));

CREATE INDEX IF NOT EXISTS idx_assets_condition
  ON public.assets (condition) WHERE condition IS NOT NULL;
