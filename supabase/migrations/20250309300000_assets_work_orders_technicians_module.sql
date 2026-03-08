-- Assets, Work Orders, Technicians module: add tenant_id and requested fields
-- Tables public.assets, public.work_orders, public.technicians already exist.

-- ---------------------------------------------------------------------------
-- ASSETS: tenant_id, asset_name, asset_tag, category, manufacturer, model, status
-- ---------------------------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS asset_name text,
  ADD COLUMN IF NOT EXISTS asset_tag text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

UPDATE public.assets a SET tenant_id = c.tenant_id FROM public.companies c WHERE a.company_id = c.id AND a.tenant_id IS NULL;
UPDATE public.assets SET asset_name = name WHERE asset_name IS NULL AND name IS NOT NULL;
UPDATE public.assets SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.assets ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS chk_assets_status;
ALTER TABLE public.assets ADD CONSTRAINT chk_assets_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_assets_tenant_id ON public.assets (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets (tenant_id, status) WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- WORK_ORDERS: tenant_id, work_order_number, requested_by_name, requested_by_email, assigned_technician_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS work_order_number text,
  ADD COLUMN IF NOT EXISTS requested_by_name text,
  ADD COLUMN IF NOT EXISTS requested_by_email text,
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL;

UPDATE public.work_orders wo SET tenant_id = c.tenant_id FROM public.companies c WHERE wo.company_id = c.id AND wo.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON public.work_orders (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_technician ON public.work_orders (assigned_technician_id) WHERE assigned_technician_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- TECHNICIANS: tenant_id, technician_name, trade, status, hourly_cost
-- ---------------------------------------------------------------------------
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS technician_name text,
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS hourly_cost numeric(12, 2);

UPDATE public.technicians t SET tenant_id = c.tenant_id FROM public.companies c WHERE t.company_id = c.id AND t.tenant_id IS NULL;
UPDATE public.technicians SET technician_name = name WHERE technician_name IS NULL AND name IS NOT NULL;
UPDATE public.technicians SET status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END WHERE status IS NULL;
ALTER TABLE public.technicians ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.technicians ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.technicians DROP CONSTRAINT IF EXISTS chk_technicians_status;
ALTER TABLE public.technicians ADD CONSTRAINT chk_technicians_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_technicians_tenant_id ON public.technicians (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_status ON public.technicians (tenant_id, status) WHERE tenant_id IS NOT NULL;
