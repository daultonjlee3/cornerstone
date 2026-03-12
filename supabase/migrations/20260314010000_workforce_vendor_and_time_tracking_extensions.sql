-- Workforce management extensions:
-- 1) vendor assignment + cost/metric support
-- 2) technician time-log compatibility table for execution analytics

-- -----------------------------------------------------------------------------
-- 1) Vendors: add single service type used by workforce assignment UI
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS service_type text;

UPDATE public.vendors
SET service_type = COALESCE(
  service_type,
  NULLIF(service_types[1], '')
)
WHERE service_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_company_service_type
  ON public.vendors (company_id, service_type)
  WHERE service_type IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) Work orders: external vendor cost for vendor performance metrics
-- -----------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS vendor_cost numeric(14, 2);

CREATE INDEX IF NOT EXISTS idx_work_orders_vendor_completed
  ON public.work_orders (vendor_id, completed_at DESC)
  WHERE vendor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3) Technician execution: compatibility table requested as work_order_time_logs
--    Canonical execution flow remains work_order_labor_entries.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_time_logs_work_order_id
  ON public.work_order_time_logs (work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_time_logs_technician_id
  ON public.work_order_time_logs (technician_id)
  WHERE technician_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_work_order_time_logs_updated_at ON public.work_order_time_logs;
CREATE TRIGGER set_work_order_time_logs_updated_at
  BEFORE UPDATE ON public.work_order_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.work_order_time_logs (
  id,
  work_order_id,
  technician_id,
  start_time,
  end_time,
  duration_minutes,
  created_at
)
SELECT
  wole.id,
  wole.work_order_id,
  wole.technician_id,
  wole.started_at,
  wole.ended_at,
  wole.duration_minutes,
  wole.created_at
FROM public.work_order_labor_entries wole
ON CONFLICT (id) DO UPDATE
SET
  work_order_id = EXCLUDED.work_order_id,
  technician_id = EXCLUDED.technician_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes;

CREATE OR REPLACE FUNCTION public.sync_work_order_time_logs_from_labor_entries_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.work_order_time_logs
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.work_order_time_logs (
    id,
    work_order_id,
    technician_id,
    start_time,
    end_time,
    duration_minutes,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.work_order_id,
    NEW.technician_id,
    NEW.started_at,
    NEW.ended_at,
    NEW.duration_minutes,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    work_order_id = EXCLUDED.work_order_id,
    technician_id = EXCLUDED.technician_id,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    duration_minutes = EXCLUDED.duration_minutes;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_time_logs_from_labor_entries ON public.work_order_labor_entries;
CREATE TRIGGER trg_sync_time_logs_from_labor_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.work_order_labor_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_work_order_time_logs_from_labor_entries_fn();
