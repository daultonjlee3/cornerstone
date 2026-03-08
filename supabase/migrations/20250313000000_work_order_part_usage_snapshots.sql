-- Work order part usage: add snapshot and audit columns for job costing and history.
-- Preserves existing data. Run after 20250311000000_work_orders_operational.sql.

-- Snapshot and audit columns (historical record independent of inventory changes)
ALTER TABLE public.work_order_part_usage
  ADD COLUMN IF NOT EXISTS part_name_snapshot text,
  ADD COLUMN IF NOT EXISTS sku_snapshot text,
  ADD COLUMN IF NOT EXISTS unit_of_measure text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.work_order_part_usage SET used_at = created_at WHERE used_at IS NULL;
UPDATE public.work_order_part_usage SET used_at = now() WHERE used_at IS NULL;
ALTER TABLE public.work_order_part_usage ALTER COLUMN used_at SET NOT NULL;
ALTER TABLE public.work_order_part_usage ALTER COLUMN used_at SET DEFAULT now();

-- Ensure total_cost is computed from quantity_used * unit_cost at application layer; column remains.

-- Index for filtering by used_at (reporting)
CREATE INDEX IF NOT EXISTS idx_work_order_part_usage_used_at
  ON public.work_order_part_usage (used_at DESC);

-- updated_at trigger
CREATE TRIGGER set_work_order_part_usage_updated_at
  BEFORE UPDATE ON public.work_order_part_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
