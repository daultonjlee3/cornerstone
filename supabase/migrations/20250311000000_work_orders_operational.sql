-- Work Orders operational elevation: new columns, status/priority enums, supporting tables
-- Preserves existing data. Run after existing work_orders migrations.

-- ---------------------------------------------------------------------------
-- 1. WORK_ORDERS: new columns and constraint updates
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS requested_by_phone text,
  ADD COLUMN IF NOT EXISTS assigned_crew_id uuid REFERENCES public.crews (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(10, 2),
  ADD COLUMN IF NOT EXISTS estimated_technicians int,
  ADD COLUMN IF NOT EXISTS actual_hours numeric(10, 2),
  ADD COLUMN IF NOT EXISTS billable boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nte_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;

-- Backfill requested_at from created_at where null
UPDATE public.work_orders SET requested_at = created_at WHERE requested_at IS NULL;

-- Category check
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_category;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_category
  CHECK (category IS NULL OR category IN ('repair', 'preventive_maintenance', 'inspection', 'installation', 'emergency', 'general'));

-- Status: add 'closed', keep existing values (draft removed from new flow but preserved in DB)
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_status;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_status
  CHECK (status IN ('draft', 'open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'closed'));

-- Priority: support emergency (map urgent -> emergency for new flow; keep urgent in DB for back compat)
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_priority_check;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_priority;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_priority
  CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'emergency'));

-- Unique work_order_number (nullable for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_orders_work_order_number
  ON public.work_orders (work_order_number) WHERE work_order_number IS NOT NULL AND work_order_number <> '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders (company_id, priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON public.work_orders (scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_crew ON public.work_orders (assigned_crew_id) WHERE assigned_crew_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. WORK_ORDER_NOTES: add note_type (align with WorkOrderNote spec)
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_order_notes ADD COLUMN IF NOT EXISTS note_type text;
UPDATE public.work_order_notes SET note_type = 'internal' WHERE note_type IS NULL;
ALTER TABLE public.work_order_notes DROP CONSTRAINT IF EXISTS chk_work_order_notes_note_type;
ALTER TABLE public.work_order_notes ADD CONSTRAINT chk_work_order_notes_note_type
  CHECK (note_type IS NULL OR note_type IN ('internal', 'customer_visible', 'completion'));

-- Rename body -> note for spec (optional; keep body if app uses it)
-- ALTER TABLE public.work_order_notes RENAME COLUMN body TO note;
-- We keep "body" to avoid breaking existing code; app can map body <-> note.

-- ---------------------------------------------------------------------------
-- 3. WORK_ORDER_CHECKLIST_ITEMS (new; work_order_tasks remains for legacy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_checklist_work_order_id ON public.work_order_checklist_items (work_order_id);

-- ---------------------------------------------------------------------------
-- 4. WORK_ORDER_PART_USAGE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_part_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  quantity_used numeric(14, 4) NOT NULL DEFAULT 0,
  unit_cost numeric(14, 2),
  total_cost numeric(14, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_part_usage_work_order_id ON public.work_order_part_usage (work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_part_usage_inventory_item ON public.work_order_part_usage (inventory_item_id) WHERE inventory_item_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. WORK_ORDER_STATUS_HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_work_order_status_history_work_order_id ON public.work_order_status_history (work_order_id);

-- ---------------------------------------------------------------------------
-- 6. WORK_ORDER_ATTACHMENTS (placeholder-ready)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_attachments_work_order_id ON public.work_order_attachments (work_order_id);

-- ---------------------------------------------------------------------------
-- 7. Trigger: record status changes into history (for new/updated rows)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.work_order_status_history_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.work_order_status_history (work_order_id, from_status, to_status, changed_by_user_id)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by_user_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.work_order_status_history (work_order_id, from_status, to_status, changed_by_user_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_order_status_history ON public.work_orders;
CREATE TRIGGER trg_work_order_status_history
  AFTER INSERT OR UPDATE OF status ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.work_order_status_history_fn();

-- Backfill status history for existing work orders (one row per WO with current status)
INSERT INTO public.work_order_status_history (work_order_id, from_status, to_status)
SELECT w.id, NULL, w.status FROM public.work_orders w
WHERE NOT EXISTS (
  SELECT 1 FROM public.work_order_status_history h WHERE h.work_order_id = w.id
);
