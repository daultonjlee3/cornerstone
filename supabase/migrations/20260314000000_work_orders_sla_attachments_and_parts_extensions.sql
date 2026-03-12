-- Work order SLA + attachments + parts compatibility extensions
-- Additive migration that extends existing architecture.

-- -----------------------------------------------------------------------------
-- 1) SLA policies (company + priority response target)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'emergency')),
  response_target_minutes integer NOT NULL CHECK (response_target_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_order_sla_policies_company_priority UNIQUE (company_id, priority)
);

CREATE INDEX IF NOT EXISTS idx_work_order_sla_policies_company
  ON public.work_order_sla_policies (company_id);

DROP TRIGGER IF EXISTS set_work_order_sla_policies_updated_at ON public.work_order_sla_policies;
CREATE TRIGGER set_work_order_sla_policies_updated_at
  BEFORE UPDATE ON public.work_order_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.work_order_sla_policies (company_id, priority, response_target_minutes)
SELECT c.id, defaults.priority, defaults.response_target_minutes
FROM public.companies c
CROSS JOIN (
  VALUES
    ('emergency'::text, 60),
    ('urgent'::text, 120),
    ('high'::text, 240),
    ('medium'::text, 1440),
    ('low'::text, 4320)
) AS defaults(priority, response_target_minutes)
ON CONFLICT (company_id, priority) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Work order SLA tracking fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_time_minutes integer,
  ADD COLUMN IF NOT EXISTS resolution_time_minutes integer;

CREATE INDEX IF NOT EXISTS idx_work_orders_first_response_at
  ON public.work_orders (first_response_at DESC)
  WHERE first_response_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_response_time_minutes
  ON public.work_orders (response_time_minutes)
  WHERE response_time_minutes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_resolution_time_minutes
  ON public.work_orders (resolution_time_minutes)
  WHERE resolution_time_minutes IS NOT NULL;

-- Backfill first response for rows already progressed beyond "new/open/draft".
UPDATE public.work_orders
SET first_response_at = COALESCE(
  first_response_at,
  started_at,
  scheduled_start,
  completed_at,
  created_at
)
WHERE first_response_at IS NULL
  AND (
    assigned_technician_id IS NOT NULL
    OR assigned_crew_id IS NOT NULL
    OR scheduled_date IS NOT NULL
    OR scheduled_start IS NOT NULL
    OR status NOT IN ('draft', 'open', 'new')
  );

CREATE OR REPLACE FUNCTION public.work_order_sla_metrics_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stamp first response on lifecycle transitions from unacknowledged states.
  IF NEW.first_response_at IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      IF (
        NEW.assigned_technician_id IS NOT NULL
        OR NEW.assigned_crew_id IS NOT NULL
        OR NEW.scheduled_date IS NOT NULL
        OR NEW.scheduled_start IS NOT NULL
        OR COALESCE(NEW.status, '') NOT IN ('draft', 'open', 'new')
      ) THEN
        NEW.first_response_at := COALESCE(NEW.started_at, NEW.scheduled_start, NEW.created_at, now());
      END IF;
    ELSE
      IF (
        (OLD.status IS DISTINCT FROM NEW.status AND COALESCE(NEW.status, '') NOT IN ('draft', 'open', 'new'))
        OR (OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id AND NEW.assigned_technician_id IS NOT NULL)
        OR (OLD.assigned_crew_id IS DISTINCT FROM NEW.assigned_crew_id AND NEW.assigned_crew_id IS NOT NULL)
        OR (OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date AND NEW.scheduled_date IS NOT NULL)
        OR (OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start AND NEW.scheduled_start IS NOT NULL)
      ) THEN
        NEW.first_response_at := now();
      END IF;
    END IF;
  END IF;

  -- Persist response duration in minutes.
  IF NEW.first_response_at IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.response_time_minutes := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.created_at)) / 60)::integer
    );
  ELSE
    NEW.response_time_minutes := NULL;
  END IF;

  -- Persist resolution duration in minutes.
  IF NEW.completed_at IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.resolution_time_minutes := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (NEW.completed_at - NEW.created_at)) / 60)::integer
    );
  ELSE
    NEW.resolution_time_minutes := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_sla_metrics ON public.work_orders;
CREATE TRIGGER trg_work_orders_sla_metrics
  BEFORE INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.work_order_sla_metrics_fn();

-- Ensure existing records have derived metrics.
UPDATE public.work_orders
SET
  response_time_minutes = CASE
    WHEN first_response_at IS NULL OR created_at IS NULL THEN NULL
    ELSE GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)::integer
    )
  END,
  resolution_time_minutes = CASE
    WHEN completed_at IS NULL OR created_at IS NULL THEN NULL
    ELSE GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60)::integer
    )
  END;

-- Stamp first response based on child events (notes/photos/parts/labor) if still missing.
CREATE OR REPLACE FUNCTION public.work_order_stamp_first_response_from_child_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  event_at timestamptz;
BEGIN
  IF NEW.work_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  event_at := COALESCE(
    (to_jsonb(NEW) ->> 'started_at')::timestamptz,
    (to_jsonb(NEW) ->> 'created_at')::timestamptz,
    now()
  );

  UPDATE public.work_orders
  SET first_response_at = COALESCE(first_response_at, event_at)
  WHERE id = NEW.work_order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_order_notes_first_response ON public.work_order_notes;
CREATE TRIGGER trg_work_order_notes_first_response
  AFTER INSERT ON public.work_order_notes
  FOR EACH ROW EXECUTE FUNCTION public.work_order_stamp_first_response_from_child_fn();

DROP TRIGGER IF EXISTS trg_work_order_attachments_first_response ON public.work_order_attachments;
CREATE TRIGGER trg_work_order_attachments_first_response
  AFTER INSERT ON public.work_order_attachments
  FOR EACH ROW EXECUTE FUNCTION public.work_order_stamp_first_response_from_child_fn();

DROP TRIGGER IF EXISTS trg_work_order_part_usage_first_response ON public.work_order_part_usage;
CREATE TRIGGER trg_work_order_part_usage_first_response
  AFTER INSERT ON public.work_order_part_usage
  FOR EACH ROW EXECUTE FUNCTION public.work_order_stamp_first_response_from_child_fn();

DROP TRIGGER IF EXISTS trg_work_order_labor_entries_first_response ON public.work_order_labor_entries;
CREATE TRIGGER trg_work_order_labor_entries_first_response
  AFTER INSERT ON public.work_order_labor_entries
  FOR EACH ROW EXECUTE FUNCTION public.work_order_stamp_first_response_from_child_fn();

-- -----------------------------------------------------------------------------
-- 3) Attachment metadata compatibility (uploaded_by/uploaded_at)
-- -----------------------------------------------------------------------------
ALTER TABLE public.work_order_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;

UPDATE public.work_order_attachments
SET uploaded_by = uploaded_by_user_id
WHERE uploaded_by IS NULL
  AND uploaded_by_user_id IS NOT NULL;

UPDATE public.work_order_attachments
SET uploaded_at = created_at
WHERE uploaded_at IS NULL;

ALTER TABLE public.work_order_attachments
  ALTER COLUMN uploaded_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_work_order_attachments_uploaded_at
  ON public.work_order_attachments (uploaded_at DESC);

-- -----------------------------------------------------------------------------
-- 4) Parts compatibility view using requested naming
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.work_order_parts AS
SELECT
  wpu.id,
  wpu.work_order_id,
  wpu.product_id,
  wpu.quantity_used,
  COALESCE(wpu.unit_cost_snapshot, wpu.unit_cost) AS unit_cost,
  wpu.total_cost
FROM public.work_order_part_usage wpu;
