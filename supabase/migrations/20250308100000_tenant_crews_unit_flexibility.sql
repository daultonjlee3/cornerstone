-- Cornerstone — Schema revision: tenants, crews, unit flexibility
-- Additive migration only. Run after 20250308000000_initial_cornerstone_schema.sql.
--
-- Summary:
-- - tenants (top-level account/workspace)
-- - tenant_memberships (user ↔ tenant)
-- - companies.tenant_id (required)
-- - units.property_id + CHECK (unit under building and/or property)
-- - crews, crew_members, work_order_crews (crew-based assignment)

-- ---------------------------------------------------------------------------
-- 1. Tenants (top-level account/workspace; one tenant can own many companies)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_tenants_slug ON public.tenants (slug) WHERE slug IS NOT NULL AND slug <> '';

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Tenant memberships (user ↔ tenant; which tenants can this user access?)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_memberships_tenant_id ON public.tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_user_id ON public.tenant_memberships (user_id);

CREATE TRIGGER set_tenant_memberships_updated_at
  BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Companies belong to a tenant
-- Add tenant_id, backfill one tenant per company, then set NOT NULL + FK.
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN tenant_id uuid;

-- Backfill: one tenant per existing company (preserves current 1:1 behavior)
DO $$
DECLARE
  r record;
  tid uuid;
BEGIN
  FOR r IN SELECT id, name, created_at, updated_at FROM public.companies WHERE tenant_id IS NULL
  LOOP
    INSERT INTO public.tenants (name, slug, created_at, updated_at)
    VALUES (r.name || ' (Tenant)', NULL, r.created_at, r.updated_at)
    RETURNING id INTO tid;
    UPDATE public.companies SET tenant_id = tid WHERE id = r.id;
  END LOOP;
END $$;

-- If any company still has no tenant (e.g. empty companies table), create default tenant
INSERT INTO public.tenants (name, slug)
SELECT 'Default Tenant', 'default'
WHERE EXISTS (SELECT 1 FROM public.companies WHERE tenant_id IS NULL);

UPDATE public.companies
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE public.companies
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.companies
  ADD CONSTRAINT fk_companies_tenant_id
  FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

CREATE INDEX idx_companies_tenant_id ON public.companies (tenant_id);

-- ---------------------------------------------------------------------------
-- 4. Units: optional building; can link directly to property
-- Add property_id. Every unit must have at least one of building_id or property_id.
-- ---------------------------------------------------------------------------
ALTER TABLE public.units
  ADD COLUMN property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL;

-- Backfill property_id from building for units that have a building
UPDATE public.units u
SET property_id = b.property_id
FROM public.buildings b
WHERE u.building_id = b.id
  AND u.property_id IS NULL;

-- CHECK: every unit must be under a building and/or a property.
-- Added as NOT VALID so existing units with both NULL do not block the migration.
-- After backfilling any such units with a valid property_id, run:
--   ALTER TABLE public.units VALIDATE CONSTRAINT chk_units_building_or_property;
ALTER TABLE public.units
  ADD CONSTRAINT chk_units_building_or_property
  CHECK (building_id IS NOT NULL OR property_id IS NOT NULL) NOT VALID;

CREATE INDEX idx_units_property_id ON public.units (property_id) WHERE property_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Crews (tenant-scoped; company optional — like units flexibility)
-- ---------------------------------------------------------------------------
CREATE TABLE public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crews_tenant_id ON public.crews (tenant_id);
CREATE INDEX idx_crews_company_id ON public.crews (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_crews_is_active ON public.crews (tenant_id, is_active) WHERE is_active = true;

CREATE TRIGGER set_crews_updated_at
  BEFORE UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Crew members (crew ↔ technicians, many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews (id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians (id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_id, technician_id)
);

CREATE INDEX idx_crew_members_crew_id ON public.crew_members (crew_id);
CREATE INDEX idx_crew_members_technician_id ON public.crew_members (technician_id);

CREATE TRIGGER set_crew_members_updated_at
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Work order crews (work order ↔ crews, many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_order_crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crews (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, crew_id)
);

CREATE INDEX idx_work_order_crews_work_order_id ON public.work_order_crews (work_order_id);
CREATE INDEX idx_work_order_crews_crew_id ON public.work_order_crews (crew_id);

CREATE TRIGGER set_work_order_crews_updated_at
  BEFORE UPDATE ON public.work_order_crews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
