-- Technician portal identity + location tracking infrastructure
-- Additive migration that extends existing multi-tenant architecture.

-- ---------------------------------------------------------------------------
-- 1) Extend role constraints to include technician users
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_role_check;
ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS chk_tenant_memberships_role;
ALTER TABLE public.tenant_memberships ADD CONSTRAINT chk_tenant_memberships_role
  CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'technician'));

ALTER TABLE public.company_memberships DROP CONSTRAINT IF EXISTS company_memberships_role_check;
ALTER TABLE public.company_memberships DROP CONSTRAINT IF EXISTS chk_company_memberships_role;
ALTER TABLE public.company_memberships ADD CONSTRAINT chk_company_memberships_role
  CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'technician'));

-- ---------------------------------------------------------------------------
-- 2) Users portal access flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_portal_only boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_portal_only
  ON public.users (is_portal_only)
  WHERE is_portal_only = true;

-- ---------------------------------------------------------------------------
-- 3) Direct technician -> user linking
-- ---------------------------------------------------------------------------
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_user_id
  ON public.technicians (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_technicians_user_id
  ON public.technicians (user_id)
  WHERE user_id IS NOT NULL;

-- Enforce that any linked technician user is a member of the same company.
CREATE OR REPLACE FUNCTION public.validate_technician_user_company_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    WHERE cm.company_id = NEW.company_id
      AND cm.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Linked technician user must belong to same company.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_technician_user_company ON public.technicians;
CREATE TRIGGER trg_validate_technician_user_company
  BEFORE INSERT OR UPDATE OF user_id, company_id ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_technician_user_company_fn();

-- ---------------------------------------------------------------------------
-- 4) Technician live location log table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technician_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  latitude double precision NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude double precision NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technician_locations_company_updated
  ON public.technician_locations (company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_technician_locations_technician_updated
  ON public.technician_locations (technician_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_technician_locations_user_updated
  ON public.technician_locations (user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

-- Keep technician "last known location" in sync from latest log inserts.
CREATE OR REPLACE FUNCTION public.sync_technician_last_location_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.technicians
  SET
    current_latitude = NEW.latitude,
    current_longitude = NEW.longitude,
    last_location_at = NEW.updated_at
  WHERE id = NEW.technician_id
    AND (
      last_location_at IS NULL
      OR NEW.updated_at >= last_location_at
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_technician_last_location ON public.technician_locations;
CREATE TRIGGER trg_sync_technician_last_location
  AFTER INSERT ON public.technician_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_technician_last_location_fn();
