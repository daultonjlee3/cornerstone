-- Additional indexes for high-traffic work order queries.
-- Safe to run multiple times via IF NOT EXISTS.

-- Composite index for company + scheduled_date filtering/sorting
CREATE INDEX IF NOT EXISTS idx_work_orders_company_scheduled_date
  ON public.work_orders (company_id, scheduled_date)
  WHERE scheduled_date IS NOT NULL;

-- Composite index for company + priority
CREATE INDEX IF NOT EXISTS idx_work_orders_company_priority
  ON public.work_orders (company_id, priority);

-- Composite index for company + assigned_technician_id
CREATE INDEX IF NOT EXISTS idx_work_orders_company_assigned_technician
  ON public.work_orders (company_id, assigned_technician_id)
  WHERE assigned_technician_id IS NOT NULL;

