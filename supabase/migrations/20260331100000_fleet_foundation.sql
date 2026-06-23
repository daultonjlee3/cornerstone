-- Fleet Intelligence Sprint 1 — foundation schema, denormalization triggers, RLS

-- ---------------------------------------------------------------------------
-- 1) Tenant product profile
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS product_profile text NOT NULL DEFAULT 'cmms'
    CHECK (product_profile IN ('cmms', 'fleet_intelligence', 'hybrid'));

COMMENT ON COLUMN public.tenants.product_profile IS
  'Controls fleet vs CMMS UI: cmms | fleet_intelligence | hybrid';

-- ---------------------------------------------------------------------------
-- 2) Helper: company scope for RLS (future use)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_company(company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.companies c
      JOIN public.tenant_memberships tm ON tm.tenant_id = c.tenant_id
      WHERE c.id = company AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_super_admins psa WHERE psa.user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- 3) branches
-- ---------------------------------------------------------------------------
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude double precision CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_company_id ON public.branches (company_id);
CREATE INDEX idx_branches_tenant_id ON public.branches (tenant_id);
CREATE UNIQUE INDEX uq_branches_company_code ON public.branches (company_id, code)
  WHERE code IS NOT NULL AND code <> '';

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.branches_company_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.companies WHERE id = NEW.company_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid company_id for branch';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_tenant_id THEN
    RAISE EXCEPTION 'branch tenant_id must match company tenant_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_branches_company_tenant_guard
  BEFORE INSERT OR UPDATE OF company_id, tenant_id ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.branches_company_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 4) customer_sites
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  name text NOT NULL,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude double precision CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  external_source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_sites_company_id ON public.customer_sites (company_id);
CREATE INDEX idx_customer_sites_tenant_id ON public.customer_sites (tenant_id);
CREATE INDEX idx_customer_sites_customer_id ON public.customer_sites (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE TRIGGER set_customer_sites_updated_at
  BEFORE UPDATE ON public.customer_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.customer_sites_company_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.companies WHERE id = NEW.company_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid company_id for customer_site';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_sites_company_tenant_guard
  BEFORE INSERT OR UPDATE OF company_id ON public.customer_sites
  FOR EACH ROW EXECUTE FUNCTION public.customer_sites_company_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 5) trucks
-- ---------------------------------------------------------------------------
CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  truck_type text NOT NULL,
  capacity jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  telematics_device_id text,
  home_latitude double precision,
  home_longitude double precision,
  external_asset_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, unit_number)
);

CREATE INDEX idx_trucks_branch_id ON public.trucks (branch_id);
CREATE INDEX idx_trucks_tenant_id ON public.trucks (tenant_id);
CREATE INDEX idx_trucks_company_id ON public.trucks (company_id);

CREATE TRIGGER set_trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.fleet_branch_scope_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT company_id, tenant_id INTO v_company_id, v_tenant_id
  FROM public.branches WHERE id = NEW.branch_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Invalid branch_id';
  END IF;
  NEW.company_id := v_company_id;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trucks_branch_scope
  BEFORE INSERT OR UPDATE OF branch_id ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.fleet_branch_scope_guard_fn();

-- ---------------------------------------------------------------------------
-- 6) fleet_operators
-- ---------------------------------------------------------------------------
CREATE TABLE public.fleet_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  operator_role text NOT NULL CHECK (operator_role IN ('driver', 'operator', 'lead')),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  technician_id uuid REFERENCES public.technicians (id) ON DELETE SET NULL,
  certifications text[] NOT NULL DEFAULT '{}'::text[],
  hourly_cost numeric(12, 2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_operators_branch_id ON public.fleet_operators (branch_id);
CREATE INDEX idx_fleet_operators_tenant_id ON public.fleet_operators (tenant_id);

CREATE TRIGGER set_fleet_operators_updated_at
  BEFORE UPDATE ON public.fleet_operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fleet_operators_branch_scope
  BEFORE INSERT OR UPDATE OF branch_id ON public.fleet_operators
  FOR EACH ROW EXECUTE FUNCTION public.fleet_branch_scope_guard_fn();

-- ---------------------------------------------------------------------------
-- 7) fleet_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.fleet_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  customer_site_id uuid NOT NULL REFERENCES public.customer_sites (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'unassigned'
    CHECK (status IN ('unassigned', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  revenue_estimate numeric(12, 2) NOT NULL CHECK (revenue_estimate >= 0),
  required_truck_type text NOT NULL,
  assigned_truck_id uuid REFERENCES public.trucks (id) ON DELETE SET NULL,
  assigned_crew_id uuid REFERENCES public.crews (id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL,
  external_source_id text,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_jobs_branch_status ON public.fleet_jobs (branch_id, status);
CREATE INDEX idx_fleet_jobs_tenant_scheduled ON public.fleet_jobs (tenant_id, scheduled_start);
CREATE INDEX idx_fleet_jobs_assigned_truck ON public.fleet_jobs (assigned_truck_id)
  WHERE assigned_truck_id IS NOT NULL;
CREATE INDEX idx_fleet_jobs_unassigned_branch ON public.fleet_jobs (branch_id)
  WHERE status = 'unassigned';

CREATE TRIGGER set_fleet_jobs_updated_at
  BEFORE UPDATE ON public.fleet_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fleet_jobs_branch_scope
  BEFORE INSERT OR UPDATE OF branch_id ON public.fleet_jobs
  FOR EACH ROW EXECUTE FUNCTION public.fleet_branch_scope_guard_fn();

-- ---------------------------------------------------------------------------
-- 8) integration_connections
-- ---------------------------------------------------------------------------
CREATE TABLE public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'csv_manual', 'samsara', 'webhook_jobs', 'webhook_telematics'
  )),
  display_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'error', 'disabled')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_ref text,
  webhook_secret_hash text,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_connections_tenant ON public.integration_connections (tenant_id);
CREATE UNIQUE INDEX uq_integration_connections_active_provider
  ON public.integration_connections (tenant_id, provider)
  WHERE status <> 'disabled';

CREATE TRIGGER set_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9) integration_sync_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.integration_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  records_processed int NOT NULL DEFAULT 0,
  records_failed int NOT NULL DEFAULT 0,
  error_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_integration_sync_runs_connection_started
  ON public.integration_sync_runs (connection_id, started_at DESC);
CREATE INDEX idx_integration_sync_runs_tenant ON public.integration_sync_runs (tenant_id);

CREATE OR REPLACE FUNCTION public.integration_sync_runs_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.integration_connections WHERE id = NEW.connection_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid connection_id';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_integration_sync_runs_tenant_guard
  BEFORE INSERT OR UPDATE OF connection_id ON public.integration_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.integration_sync_runs_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 10) external_entity_mappings
-- ---------------------------------------------------------------------------
CREATE TABLE public.external_entity_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'branch', 'truck', 'fleet_job', 'customer_site', 'fleet_operator'
  )),
  external_id text NOT NULL,
  internal_id uuid NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, entity_type, external_id)
);

CREATE INDEX idx_external_entity_mappings_internal
  ON public.external_entity_mappings (connection_id, entity_type, internal_id);
CREATE INDEX idx_external_entity_mappings_tenant ON public.external_entity_mappings (tenant_id);

CREATE OR REPLACE FUNCTION public.external_entity_mappings_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.integration_connections WHERE id = NEW.connection_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid connection_id';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_external_entity_mappings_tenant_guard
  BEFORE INSERT OR UPDATE OF connection_id ON public.external_entity_mappings
  FOR EACH ROW EXECUTE FUNCTION public.external_entity_mappings_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 11) Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_entity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant_isolation ON public.branches
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY customer_sites_tenant_isolation ON public.customer_sites
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY trucks_tenant_isolation ON public.trucks
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY fleet_operators_tenant_isolation ON public.fleet_operators
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY fleet_jobs_tenant_isolation ON public.fleet_jobs
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_connections_tenant_isolation ON public.integration_connections
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_sync_runs_tenant_isolation ON public.integration_sync_runs
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY external_entity_mappings_tenant_isolation ON public.external_entity_mappings
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));
