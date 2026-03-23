-- PM Plan -> PM Schedule -> PM Tasks -> PM Runs hierarchy extensions

-- Top-level PM plans (program grouping)
CREATE TABLE IF NOT EXISTS public.pm_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If pm_plans already existed from an earlier draft, make sure required columns exist.
ALTER TABLE public.pm_plans
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill tenant for pre-existing rows that were created before tenant_id existed.
UPDATE public.pm_plans pp
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE pp.company_id = c.id
  AND pp.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_plans_tenant_company
  ON public.pm_plans (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_active
  ON public.pm_plans (active);

DROP TRIGGER IF EXISTS set_pm_plans_updated_at ON public.pm_plans;
CREATE TRIGGER set_pm_plans_updated_at
  BEFORE UPDATE ON public.pm_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend existing schedule table (preventive_maintenance_plans) with PM plan linkage and execution config.
ALTER TABLE public.preventive_maintenance_plans
  ADD COLUMN IF NOT EXISTS pm_plan_id uuid REFERENCES public.pm_plans (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interval_value int,
  ADD COLUMN IF NOT EXISTS generate_parent_work_order boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generate_child_work_orders boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pm_schedules_pm_plan_id
  ON public.preventive_maintenance_plans (pm_plan_id);

-- Schedule task definitions
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_schedule_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_schedule_id uuid NOT NULL REFERENCES public.preventive_maintenance_plans (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_schedule_tasks_schedule_id
  ON public.preventive_maintenance_schedule_tasks (pm_schedule_id, sort_order, created_at);

DROP TRIGGER IF EXISTS set_preventive_maintenance_schedule_tasks_updated_at ON public.preventive_maintenance_schedule_tasks;
CREATE TRIGGER set_preventive_maintenance_schedule_tasks_updated_at
  BEFORE UPDATE ON public.preventive_maintenance_schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend PM runs with direct schedule + plan reporting and parent WO linkage.
ALTER TABLE public.preventive_maintenance_runs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_schedule_id uuid REFERENCES public.preventive_maintenance_plans (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_plan_id uuid REFERENCES public.pm_plans (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_runs_schedule_id
  ON public.preventive_maintenance_runs (pm_schedule_id);
CREATE INDEX IF NOT EXISTS idx_pm_runs_plan_id
  ON public.preventive_maintenance_runs (pm_plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_runs_company_id
  ON public.preventive_maintenance_runs (company_id);

-- Backfill run fields from existing schedule rows where possible.
UPDATE public.preventive_maintenance_runs r
SET
  company_id = p.company_id,
  pm_schedule_id = p.id,
  pm_plan_id = p.pm_plan_id,
  generated_at = COALESCE(r.generated_at, r.updated_at, r.created_at)
FROM public.preventive_maintenance_plans p
WHERE r.preventive_maintenance_plan_id = p.id
  AND (r.company_id IS NULL OR r.pm_schedule_id IS NULL OR r.generated_at IS NULL);
