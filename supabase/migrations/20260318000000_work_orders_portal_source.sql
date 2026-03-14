-- Allow work orders created from the public maintenance request portal.
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_source_type;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_source_type
  CHECK (
    source_type IS NULL OR source_type IN ('manual', 'preventive_maintenance', 'portal')
  );
