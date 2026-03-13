-- Inventory tenant hardening
-- Ensure products, stock_locations, inventory_balances, and inventory_transactions
-- are all tenant-scoped and protected by Row Level Security.
--
-- This migration is additive and follows existing patterns from:
-- - 20250308100000_tenant_crews_unit_flexibility.sql
-- - 20250309300000_assets_work_orders_technicians_module.sql

-- ---------------------------------------------------------------------------
-- 1) Add tenant_id to products and stock_locations
-- ---------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE;

UPDATE public.products p
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE p.company_id = c.id
  AND p.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id
  ON public.products (tenant_id)
  WHERE tenant_id IS NOT NULL;

ALTER TABLE public.stock_locations
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE;

UPDATE public.stock_locations sl
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE sl.company_id = c.id
  AND sl.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_stock_locations_tenant_id
  ON public.stock_locations (tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Add tenant_id + company_id to inventory_balances
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_balances
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE;

UPDATE public.inventory_balances ib
SET
  company_id = p.company_id,
  tenant_id = c.tenant_id
FROM public.products p
JOIN public.companies c
  ON p.company_id = c.id
WHERE ib.product_id = p.id
  AND (ib.company_id IS NULL OR ib.tenant_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_tenant_company
  ON public.inventory_balances (tenant_id, company_id);

-- Prevent mismatched company/tenant between inventory_balances, products, and stock_locations.
CREATE OR REPLACE FUNCTION public.inventory_balances_company_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_company_id uuid;
  v_product_tenant_id uuid;
  v_location_company_id uuid;
  v_location_tenant_id uuid;
BEGIN
  SELECT company_id, tenant_id
  INTO v_product_company_id, v_product_tenant_id
  FROM public.products
  WHERE id = NEW.product_id;

  SELECT company_id, tenant_id
  INTO v_location_company_id, v_location_tenant_id
  FROM public.stock_locations
  WHERE id = NEW.stock_location_id;

  IF v_product_company_id IS NULL OR v_location_company_id IS NULL THEN
    RAISE EXCEPTION 'inventory_balances must reference existing product and stock_location';
  END IF;

  IF v_product_company_id <> v_location_company_id THEN
    RAISE EXCEPTION 'inventory_balances company_id must match product and stock_location company_id';
  END IF;

  IF v_product_tenant_id IS NULL OR v_location_tenant_id IS NULL THEN
    RAISE EXCEPTION 'inventory_balances requires tenant alignment across product and stock_location';
  END IF;

  IF v_product_tenant_id <> v_location_tenant_id THEN
    RAISE EXCEPTION 'inventory_balances tenant_id must match product and stock_location tenant_id';
  END IF;

  NEW.company_id := v_product_company_id;
  NEW.tenant_id := v_product_tenant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_balances_company_tenant_guard ON public.inventory_balances;
CREATE TRIGGER trg_inventory_balances_company_tenant_guard
  BEFORE INSERT OR UPDATE OF product_id, stock_location_id, company_id, tenant_id
  ON public.inventory_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_balances_company_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 3) Add tenant_id to inventory_transactions and enforce company alignment
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE;

UPDATE public.inventory_transactions it
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE it.company_id = c.id
  AND it.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_company
  ON public.inventory_transactions (tenant_id, company_id)
  WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.inventory_transactions_company_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_tenant_id uuid;
  v_product_company_id uuid;
  v_product_tenant_id uuid;
  v_location_company_id uuid;
  v_location_tenant_id uuid;
BEGIN
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'inventory_transactions.company_id is required';
  END IF;

  SELECT tenant_id
  INTO v_company_tenant_id
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company_tenant_id IS NULL THEN
    RAISE EXCEPTION 'inventory_transactions.company_id must reference a company with tenant_id';
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT company_id, tenant_id
    INTO v_product_company_id, v_product_tenant_id
    FROM public.products
    WHERE id = NEW.product_id;

    IF v_product_company_id IS NOT NULL AND v_product_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'inventory_transactions.product_id must belong to the same company';
    END IF;

    IF v_product_tenant_id IS NOT NULL AND v_product_tenant_id <> v_company_tenant_id THEN
      RAISE EXCEPTION 'inventory_transactions.product_id must belong to the same tenant';
    END IF;
  END IF;

  IF NEW.stock_location_id IS NOT NULL THEN
    SELECT company_id, tenant_id
    INTO v_location_company_id, v_location_tenant_id
    FROM public.stock_locations
    WHERE id = NEW.stock_location_id;

    IF v_location_company_id IS NOT NULL AND v_location_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'inventory_transactions.stock_location_id must belong to the same company';
    END IF;

    IF v_location_tenant_id IS NOT NULL AND v_location_tenant_id <> v_company_tenant_id THEN
      RAISE EXCEPTION 'inventory_transactions.stock_location_id must belong to the same tenant';
    END IF;
  END IF;

  NEW.tenant_id := v_company_tenant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_transactions_company_tenant_guard ON public.inventory_transactions;
CREATE TRIGGER trg_inventory_transactions_company_tenant_guard
  BEFORE INSERT OR UPDATE OF company_id, product_id, stock_location_id, tenant_id
  ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_transactions_company_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 4) Row Level Security policies
-- ---------------------------------------------------------------------------

-- Helper: does the current auth user have access to the tenant owning this row?
CREATE OR REPLACE FUNCTION public.current_user_has_tenant(tenant uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.platform_super_admins psa
      WHERE psa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenant
    );
$$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_tenant_isolation ON public.products;
CREATE POLICY products_tenant_isolation
  ON public.products
  USING (public.current_user_has_tenant(tenant_id));

DROP POLICY IF EXISTS stock_locations_tenant_isolation ON public.stock_locations;
CREATE POLICY stock_locations_tenant_isolation
  ON public.stock_locations
  USING (public.current_user_has_tenant(tenant_id));

DROP POLICY IF EXISTS inventory_balances_tenant_isolation ON public.inventory_balances;
CREATE POLICY inventory_balances_tenant_isolation
  ON public.inventory_balances
  USING (public.current_user_has_tenant(tenant_id));

DROP POLICY IF EXISTS inventory_transactions_tenant_isolation ON public.inventory_transactions;
CREATE POLICY inventory_transactions_tenant_isolation
  ON public.inventory_transactions
  USING (public.current_user_has_tenant(tenant_id));

