-- Per-company control for auto-creating work orders from portal requests

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS auto_create_work_orders_from_requests boolean NOT NULL DEFAULT true;

