-- Asset hierarchy support via self-referential parent/child relationship.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS parent_asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL;

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS chk_assets_parent_not_self;
ALTER TABLE public.assets
  ADD CONSTRAINT chk_assets_parent_not_self
  CHECK (parent_asset_id IS NULL OR parent_asset_id <> id);

CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id
  ON public.assets (parent_asset_id)
  WHERE parent_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_company_parent_asset
  ON public.assets (company_id, parent_asset_id);
