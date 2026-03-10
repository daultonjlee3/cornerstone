-- Technician portal execution support:
-- 1) granular labor session tracking
-- 2) richer photo attachment metadata

CREATE TABLE IF NOT EXISTS public.work_order_labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_labor_entries_work_order_id
  ON public.work_order_labor_entries (work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_labor_entries_technician_id
  ON public.work_order_labor_entries (technician_id) WHERE technician_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_order_labor_entries_single_active
  ON public.work_order_labor_entries (work_order_id)
  WHERE is_active = true;

ALTER TABLE public.work_order_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS caption text;

ALTER TABLE public.work_order_notes
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL;
