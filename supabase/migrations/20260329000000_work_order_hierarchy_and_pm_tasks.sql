-- Work order hierarchy + PM task expansion

-- 1) Parent/child work orders (single-level nesting only)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS parent_work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_parent_work_order_id
  ON public.work_orders (parent_work_order_id)
  WHERE parent_work_order_id IS NOT NULL;

ALTER TABLE public.work_orders
  ADD CONSTRAINT chk_work_orders_not_own_parent
  CHECK (parent_work_order_id IS NULL OR parent_work_order_id <> id);

CREATE OR REPLACE FUNCTION public.enforce_single_level_work_order_nesting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_parent_id uuid;
BEGIN
  IF NEW.parent_work_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT parent_work_order_id
  INTO parent_parent_id
  FROM public.work_orders
  WHERE id = NEW.parent_work_order_id;

  IF parent_parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only one level of work order nesting is supported.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_level_work_order_nesting ON public.work_orders;
CREATE TRIGGER trg_enforce_single_level_work_order_nesting
  BEFORE INSERT OR UPDATE OF parent_work_order_id ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_level_work_order_nesting();

-- 2) PM template task items
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_template_id uuid NOT NULL REFERENCES public.preventive_maintenance_templates (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  asset_group text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_template_tasks_template_id
  ON public.preventive_maintenance_template_tasks (pm_template_id, sort_order, created_at);

DROP TRIGGER IF EXISTS set_preventive_maintenance_template_tasks_updated_at ON public.preventive_maintenance_template_tasks;
CREATE TRIGGER set_preventive_maintenance_template_tasks_updated_at
  BEFORE UPDATE ON public.preventive_maintenance_template_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) PM run -> many generated work orders
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_run_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preventive_maintenance_run_id uuid NOT NULL REFERENCES public.preventive_maintenance_runs (id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preventive_maintenance_run_id, work_order_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_run_work_orders_run_id
  ON public.preventive_maintenance_run_work_orders (preventive_maintenance_run_id);

CREATE INDEX IF NOT EXISTS idx_pm_run_work_orders_work_order_id
  ON public.preventive_maintenance_run_work_orders (work_order_id);
