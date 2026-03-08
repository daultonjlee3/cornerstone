-- Work order structured completion / closeout fields
-- Preserves existing data. completed_at and actual_hours may already exist.

-- ---------------------------------------------------------------------------
-- 1. Completion fields on work_orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS resolution_summary text,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS follow_up_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_visible_summary text,
  ADD COLUMN IF NOT EXISTS internal_completion_notes text,
  ADD COLUMN IF NOT EXISTS completed_by_technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_status text;

-- Backfill completion_date from completed_at where we have completed_at but no completion_date
UPDATE public.work_orders
SET completion_date = (completed_at AT TIME ZONE 'UTC')::date
WHERE completed_at IS NOT NULL AND completion_date IS NULL;

-- completion_status enum (as CHECK)
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_completion_status;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_completion_status
  CHECK (completion_status IS NULL OR completion_status IN (
    'successful',
    'partially_completed',
    'deferred',
    'unable_to_complete'
  ));

-- Indexes for list filtering/sorting
CREATE INDEX IF NOT EXISTS idx_work_orders_completed_at
  ON public.work_orders (completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_completion_status
  ON public.work_orders (company_id, completion_status) WHERE completion_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_completed_by_technician
  ON public.work_orders (completed_by_technician_id) WHERE completed_by_technician_id IS NOT NULL;
