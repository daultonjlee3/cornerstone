-- Add safety notes fields for technician work execution context.
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS safety_notes text;

ALTER TABLE public.preventive_maintenance_plans
  ADD COLUMN IF NOT EXISTS safety_notes text;
