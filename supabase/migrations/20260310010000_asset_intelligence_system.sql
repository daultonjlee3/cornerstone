-- Asset Intelligence System foundations
-- Adds health/risk fields, recurring insight storage, and timeline event support.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS health_score numeric(5, 2),
  ADD COLUMN IF NOT EXISTS failure_risk numeric(5, 2),
  ADD COLUMN IF NOT EXISTS last_health_calculation timestamptz,
  ADD COLUMN IF NOT EXISTS expected_life_years integer,
  ADD COLUMN IF NOT EXISTS replacement_cost numeric(14, 2),
  ADD COLUMN IF NOT EXISTS maintenance_cost_last_12_months numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS chk_assets_health_score_range;
ALTER TABLE public.assets
  ADD CONSTRAINT chk_assets_health_score_range
  CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100));

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS chk_assets_failure_risk_range;
ALTER TABLE public.assets
  ADD CONSTRAINT chk_assets_failure_risk_range
  CHECK (failure_risk IS NULL OR (failure_risk >= 0 AND failure_risk <= 100));

CREATE INDEX IF NOT EXISTS idx_assets_health_score ON public.assets (company_id, health_score);
CREATE INDEX IF NOT EXISTS idx_assets_failure_risk ON public.assets (company_id, failure_risk);
CREATE INDEX IF NOT EXISTS idx_assets_last_health_calculation ON public.assets (last_health_calculation DESC);

CREATE TABLE IF NOT EXISTS public.asset_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL,
  pattern_type text NOT NULL,
  frequency integer NOT NULL DEFAULT 1,
  recommendation text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'rule_engine',
  detected_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_insights
  DROP CONSTRAINT IF EXISTS chk_asset_insights_severity;
ALTER TABLE public.asset_insights
  ADD CONSTRAINT chk_asset_insights_severity
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS idx_asset_insights_asset_id ON public.asset_insights (asset_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_insights_tenant_company ON public.asset_insights (tenant_id, company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_asset_insights_pattern_type ON public.asset_insights (pattern_type);

CREATE TABLE IF NOT EXISTS public.asset_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  details text,
  event_at timestamptz NOT NULL DEFAULT now(),
  work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL,
  technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_timeline_events_asset_id ON public.asset_timeline_events (asset_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_timeline_events_tenant_company ON public.asset_timeline_events (tenant_id, company_id, event_at DESC);
