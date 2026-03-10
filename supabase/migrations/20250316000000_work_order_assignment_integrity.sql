-- Ensure assignment target is unambiguous: a work order can be assigned to
-- one technician OR one crew, but not both at the same time.
UPDATE public.work_orders
SET assigned_technician_id = NULL
WHERE assigned_technician_id IS NOT NULL
  AND assigned_crew_id IS NOT NULL;

ALTER TABLE public.work_orders
DROP CONSTRAINT IF EXISTS chk_work_orders_single_assignment_target;

ALTER TABLE public.work_orders
ADD CONSTRAINT chk_work_orders_single_assignment_target
CHECK (NOT (
  assigned_technician_id IS NOT NULL
  AND assigned_crew_id IS NOT NULL
));
