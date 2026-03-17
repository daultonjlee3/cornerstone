-- Preventive Maintenance system: plans, runs, templates, and work-order source linkage
-- Additive migration compatible with existing tenant/company model.

-- ---------------------------------------------------------------------------
-- 1. Preventive maintenance templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  frequency_type text NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  frequency_interval int NOT NULL DEFAULT 1 CHECK (frequency_interval > 0),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'emergency')),
  estimated_duration_minutes int CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_templates_company_id
  ON public.preventive_maintenance_templates (company_id);

DROP TRIGGER IF EXISTS set_preventive_maintenance_templates_updated_at ON public.preventive_maintenance_templates;
CREATE TRIGGER set_preventive_maintenance_templates_updated_at
  BEFORE UPDATE ON public.preventive_maintenance_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Preventive maintenance plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.preventive_maintenance_templates (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  frequency_type text NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  frequency_interval int NOT NULL DEFAULT 1 CHECK (frequency_interval > 0),
  start_date date NOT NULL,
  next_run_date date NOT NULL,
  last_run_date date,
  auto_create_work_order boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'emergency')),
  estimated_duration_minutes int CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  assigned_technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  instructions text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_plans_tenant_id
  ON public.preventive_maintenance_plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_company_id
  ON public.preventive_maintenance_plans (company_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_asset_id
  ON public.preventive_maintenance_plans (asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_plans_next_run
  ON public.preventive_maintenance_plans (status, next_run_date);
CREATE INDEX IF NOT EXISTS idx_pm_plans_assigned_technician
  ON public.preventive_maintenance_plans (assigned_technician_id) WHERE assigned_technician_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_preventive_maintenance_plans_updated_at ON public.preventive_maintenance_plans;
CREATE TRIGGER set_preventive_maintenance_plans_updated_at
  BEFORE UPDATE ON public.preventive_maintenance_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Preventive maintenance runs (execution history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preventive_maintenance_plan_id uuid NOT NULL REFERENCES public.preventive_maintenance_plans (id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  generated_work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'skipped', 'failed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preventive_maintenance_plan_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_pm_runs_plan_id
  ON public.preventive_maintenance_runs (preventive_maintenance_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_runs_scheduled_date
  ON public.preventive_maintenance_runs (scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_pm_runs_generated_work_order
  ON public.preventive_maintenance_runs (generated_work_order_id) WHERE generated_work_order_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_preventive_maintenance_runs_updated_at ON public.preventive_maintenance_runs;
CREATE TRIGGER set_preventive_maintenance_runs_updated_at
  BEFORE UPDATE ON public.preventive_maintenance_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Work order source linkage for PM-generated work
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS preventive_maintenance_plan_id uuid REFERENCES public.preventive_maintenance_plans (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preventive_maintenance_run_id uuid REFERENCES public.preventive_maintenance_runs (id) ON DELETE SET NULL;

ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_source_type;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_source_type
  CHECK (
    source_type IS NULL OR source_type IN ('manual', 'preventive_maintenance')
  );

CREATE INDEX IF NOT EXISTS idx_work_orders_source_type
  ON public.work_orders (source_type) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_pm_plan_id
  ON public.work_orders (preventive_maintenance_plan_id) WHERE preventive_maintenance_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_pm_run_id
  ON public.work_orders (preventive_maintenance_run_id) WHERE preventive_maintenance_run_id IS NOT NULL;
