-- Centralized activity logs + workflow lifecycle compatibility updates
-- Additive only: extends existing modules without replacing them.

-- ---------------------------------------------------------------------------
-- 1) Central activity log table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type text NOT NULL,
  performed_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_state jsonb,
  after_state jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON public.activity_logs (entity_type, entity_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type
  ON public.activity_logs (action_type, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant
  ON public.activity_logs (tenant_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company
  ON public.activity_logs (company_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- 2) Asset service tracking fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS last_serviced_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_service_work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_last_serviced_at
  ON public.assets (last_serviced_at DESC) WHERE last_serviced_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Work order lifecycle status compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_status;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_status
  CHECK (status IN (
    'draft',
    'open',
    'assigned',
    'closed',
    'new',
    'ready_to_schedule',
    'scheduled',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
  ));
