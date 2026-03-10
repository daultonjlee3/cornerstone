-- Technician execution lifecycle timestamps
-- Additive migration for start/pause execution controls.

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_paused_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_work_orders_started_at
  ON public.work_orders (started_at DESC) WHERE started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_last_paused_at
  ON public.work_orders (last_paused_at DESC) WHERE last_paused_at IS NOT NULL;
