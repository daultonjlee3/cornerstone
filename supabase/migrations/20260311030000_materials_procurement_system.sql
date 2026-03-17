-- Materials & Procurement System foundation
-- Extends existing inventory/procurement schema without breaking legacy flows.

-- -----------------------------------------------------------------------------
-- 1) Vendors enhancements
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS preferred_vendor boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendors_preferred
  ON public.vendors (company_id, preferred_vendor)
  WHERE preferred_vendor = true;

-- -----------------------------------------------------------------------------
-- 2) Products master catalog (company-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  description text,
  category text,
  unit_of_measure text,
  default_vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  default_cost numeric(14, 2),
  reorder_point_default numeric(14, 4),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_default_vendor ON public.products (default_vendor_id) WHERE default_vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (company_id, category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (company_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_sku
  ON public.products (company_id, sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) Stock locations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'warehouse' CHECK (
    location_type IN ('warehouse', 'maintenance_shop', 'property_storage', 'building_storage', 'unit_storage', 'truck', 'other')
  ),
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_company_id ON public.stock_locations (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_property_id ON public.stock_locations (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_locations_building_id ON public.stock_locations (building_id) WHERE building_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_locations_unit_id ON public.stock_locations (unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_locations_active ON public.stock_locations (company_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_location_default_per_company
  ON public.stock_locations (company_id)
  WHERE is_default = true;

DROP TRIGGER IF EXISTS set_stock_locations_updated_at ON public.stock_locations;
CREATE TRIGGER set_stock_locations_updated_at
  BEFORE UPDATE ON public.stock_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) Inventory balances (location-level quantity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  stock_location_id uuid NOT NULL REFERENCES public.stock_locations (id) ON DELETE CASCADE,
  quantity_on_hand numeric(14, 4) NOT NULL DEFAULT 0,
  minimum_stock numeric(14, 4),
  reorder_point numeric(14, 4),
  last_counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balances_non_negative_qty CHECK (quantity_on_hand >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_balances_product_location
  ON public.inventory_balances (product_id, stock_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_location ON public.inventory_balances (stock_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_low_stock
  ON public.inventory_balances (stock_location_id, quantity_on_hand, reorder_point)
  WHERE reorder_point IS NOT NULL;

DROP TRIGGER IF EXISTS set_inventory_balances_updated_at ON public.inventory_balances;
CREATE TRIGGER set_inventory_balances_updated_at
  BEFORE UPDATE ON public.inventory_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5) Extend legacy tables to support products/location-based inventory
-- -----------------------------------------------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id
  ON public.inventory_items (product_id)
  WHERE product_id IS NOT NULL;

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_location_id uuid REFERENCES public.stock_locations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_change numeric(14, 4),
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE public.inventory_transactions
SET quantity_change = quantity_delta
WHERE quantity_change IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_id
  ON public.inventory_transactions (company_id)
  WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id
  ON public.inventory_transactions (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_stock_location
  ON public.inventory_transactions (stock_location_id)
  WHERE stock_location_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_transactions_idempotency_key
  ON public.inventory_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND btrim(idempotency_key) <> '';

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'purchase_received',
      'work_order_usage',
      'adjustment',
      'transfer_in',
      'transfer_out',
      -- legacy values (kept for backwards compatibility)
      'receipt',
      'issue',
      'return'
    )
  );

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS total_cost numeric(14, 2) NOT NULL DEFAULT 0;

UPDATE public.purchase_orders
SET expected_delivery_date = expected_date
WHERE expected_delivery_date IS NULL AND expected_date IS NOT NULL;

UPDATE public.purchase_orders
SET status = CASE
  WHEN status = 'sent' THEN 'ordered'
  WHEN status = 'partial' THEN 'partially_received'
  ELSE status
END
WHERE status IN ('sent', 'partial');

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled'));

ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_total numeric(14, 2);

UPDATE public.purchase_order_lines
SET line_total = COALESCE(quantity, 0) * COALESCE(unit_price, 0)
WHERE line_total IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_product_id
  ON public.purchase_order_lines (product_id)
  WHERE product_id IS NOT NULL;

ALTER TABLE public.work_order_part_usage
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_location_id uuid REFERENCES public.stock_locations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_order_part_usage_product
  ON public.work_order_part_usage (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_order_part_usage_stock_location
  ON public.work_order_part_usage (stock_location_id)
  WHERE stock_location_id IS NOT NULL;

ALTER TABLE public.work_order_part_usage
  DROP CONSTRAINT IF EXISTS work_order_part_usage_positive_qty;
ALTER TABLE public.work_order_part_usage
  ADD CONSTRAINT work_order_part_usage_positive_qty CHECK (quantity_used > 0);

-- -----------------------------------------------------------------------------
-- 6) Backfill products, locations, balances, and foreign keys
-- -----------------------------------------------------------------------------
INSERT INTO public.products (
  company_id,
  name,
  sku,
  description,
  category,
  unit_of_measure,
  default_vendor_id,
  default_cost,
  reorder_point_default,
  active
)
SELECT
  ii.company_id,
  ii.name,
  NULLIF(btrim(ii.sku), ''),
  ii.notes,
  'general',
  ii.unit,
  ii.vendor_id,
  ii.cost,
  ii.min_quantity,
  true
FROM public.inventory_items ii
LEFT JOIN public.products p
  ON p.company_id = ii.company_id
 AND lower(p.name) = lower(ii.name)
 AND COALESCE(NULLIF(btrim(p.sku), ''), '__none__') = COALESCE(NULLIF(btrim(ii.sku), ''), '__none__')
WHERE p.id IS NULL;

UPDATE public.inventory_items ii
SET product_id = p.id
FROM public.products p
WHERE ii.product_id IS NULL
  AND p.company_id = ii.company_id
  AND lower(p.name) = lower(ii.name)
  AND COALESCE(NULLIF(btrim(p.sku), ''), '__none__') = COALESCE(NULLIF(btrim(ii.sku), ''), '__none__');

INSERT INTO public.stock_locations (company_id, name, location_type, active, is_default)
SELECT c.id, 'Main Stock', 'warehouse', true, true
FROM public.companies c
LEFT JOIN public.stock_locations sl
  ON sl.company_id = c.id
 AND sl.is_default = true
WHERE sl.id IS NULL;

INSERT INTO public.inventory_balances (
  product_id,
  stock_location_id,
  quantity_on_hand,
  minimum_stock,
  reorder_point
)
SELECT
  ii.product_id,
  sl.id,
  COALESCE(ii.quantity, 0),
  ii.min_quantity,
  COALESCE(ii.min_quantity, p.reorder_point_default)
FROM public.inventory_items ii
JOIN public.products p ON p.id = ii.product_id
JOIN public.stock_locations sl
  ON sl.company_id = ii.company_id
 AND sl.is_default = true
LEFT JOIN public.inventory_balances ib
  ON ib.product_id = ii.product_id
 AND ib.stock_location_id = sl.id
WHERE ii.product_id IS NOT NULL
  AND ib.id IS NULL;

UPDATE public.purchase_order_lines pol
SET product_id = ii.product_id
FROM public.inventory_items ii
WHERE pol.product_id IS NULL
  AND pol.inventory_item_id = ii.id
  AND ii.product_id IS NOT NULL;

UPDATE public.work_order_part_usage wpu
SET product_id = ii.product_id
FROM public.inventory_items ii
WHERE wpu.product_id IS NULL
  AND wpu.inventory_item_id = ii.id
  AND ii.product_id IS NOT NULL;

UPDATE public.work_order_part_usage wpu
SET stock_location_id = sl.id
FROM public.work_orders wo
JOIN public.stock_locations sl
  ON sl.company_id = wo.company_id
 AND sl.is_default = true
WHERE wpu.stock_location_id IS NULL
  AND wpu.work_order_id = wo.id;

UPDATE public.inventory_transactions it
SET
  company_id = ii.company_id,
  product_id = ii.product_id,
  stock_location_id = sl.id,
  quantity_change = COALESCE(it.quantity_change, it.quantity_delta)
FROM public.inventory_items ii
LEFT JOIN public.stock_locations sl
  ON sl.company_id = ii.company_id
 AND sl.is_default = true
WHERE it.inventory_item_id = ii.id
  AND (
    it.company_id IS NULL
    OR it.product_id IS NULL
    OR it.stock_location_id IS NULL
    OR it.quantity_change IS NULL
  );

-- -----------------------------------------------------------------------------
-- 7) Purchase order line and header total maintenance
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_order_line_total_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_order_line_total ON public.purchase_order_lines;
CREATE TRIGGER trg_purchase_order_line_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.purchase_order_line_total_fn();

CREATE OR REPLACE FUNCTION public.refresh_purchase_order_total_cost(p_purchase_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.purchase_orders po
  SET total_cost = COALESCE(lines.total_cost, 0)
  FROM (
    SELECT purchase_order_id, SUM(COALESCE(line_total, 0)) AS total_cost
    FROM public.purchase_order_lines
    WHERE purchase_order_id = p_purchase_order_id
    GROUP BY purchase_order_id
  ) AS lines
  WHERE po.id = p_purchase_order_id;

  UPDATE public.purchase_orders
  SET total_cost = 0
  WHERE id = p_purchase_order_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.purchase_order_lines
      WHERE purchase_order_id = p_purchase_order_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_order_totals_sync_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_po_id uuid;
BEGIN
  target_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  IF target_po_id IS NOT NULL THEN
    PERFORM public.refresh_purchase_order_total_cost(target_po_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_order_totals_sync_ins ON public.purchase_order_lines;
DROP TRIGGER IF EXISTS trg_purchase_order_totals_sync_upd ON public.purchase_order_lines;
DROP TRIGGER IF EXISTS trg_purchase_order_totals_sync_del ON public.purchase_order_lines;

CREATE TRIGGER trg_purchase_order_totals_sync_ins
  AFTER INSERT ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.purchase_order_totals_sync_fn();
CREATE TRIGGER trg_purchase_order_totals_sync_upd
  AFTER UPDATE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.purchase_order_totals_sync_fn();
CREATE TRIGGER trg_purchase_order_totals_sync_del
  AFTER DELETE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.purchase_order_totals_sync_fn();

-- Recompute all existing PO totals once.
DO $$
DECLARE
  po_row record;
BEGIN
  FOR po_row IN SELECT id FROM public.purchase_orders LOOP
    PERFORM public.refresh_purchase_order_total_cost(po_row.id);
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 8) Atomic inventory movement function (prevents races + negative stock)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
  p_company_id uuid,
  p_product_id uuid,
  p_stock_location_id uuid,
  p_quantity_change numeric,
  p_transaction_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
  balance_id uuid,
  quantity_on_hand numeric,
  transaction_id uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance_id uuid;
  v_current_qty numeric;
  v_next_qty numeric;
  v_transaction_id uuid;
  v_existing_qty numeric;
  v_existing_balance_id uuid;
  v_existing_tx_id uuid;
BEGIN
  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Quantity change must be non-zero.';
  END IF;

  IF p_transaction_type NOT IN (
    'purchase_received',
    'work_order_usage',
    'adjustment',
    'transfer_in',
    'transfer_out',
    'receipt',
    'issue',
    'return'
  ) THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT it.id, ib.id, ib.quantity_on_hand
    INTO v_existing_tx_id, v_existing_balance_id, v_existing_qty
    FROM public.inventory_transactions it
    LEFT JOIN public.inventory_balances ib
      ON ib.product_id = it.product_id
     AND ib.stock_location_id = it.stock_location_id
    WHERE it.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_balance_id, COALESCE(v_existing_qty, 0), v_existing_tx_id;
      RETURN;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Product not found for company.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stock_locations sl
    WHERE sl.id = p_stock_location_id
      AND sl.company_id = p_company_id
      AND sl.active = true
  ) THEN
    RAISE EXCEPTION 'Stock location not found, inactive, or outside company scope.';
  END IF;

  INSERT INTO public.inventory_balances (
    product_id,
    stock_location_id,
    quantity_on_hand
  )
  VALUES (p_product_id, p_stock_location_id, 0)
  ON CONFLICT (product_id, stock_location_id) DO NOTHING;

  SELECT ib.id, ib.quantity_on_hand
  INTO v_balance_id, v_current_qty
  FROM public.inventory_balances ib
  WHERE ib.product_id = p_product_id
    AND ib.stock_location_id = p_stock_location_id
  FOR UPDATE;

  v_next_qty := COALESCE(v_current_qty, 0) + p_quantity_change;
  IF v_next_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available %, requested delta %.', COALESCE(v_current_qty, 0), p_quantity_change;
  END IF;

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_next_qty,
      updated_at = now()
  WHERE id = v_balance_id;

  INSERT INTO public.inventory_transactions (
    company_id,
    product_id,
    stock_location_id,
    inventory_item_id,
    quantity_change,
    quantity_delta,
    transaction_type,
    reference_type,
    reference_id,
    notes,
    idempotency_key
  )
  VALUES (
    p_company_id,
    p_product_id,
    p_stock_location_id,
    NULL,
    p_quantity_change,
    p_quantity_change,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_notes,
    NULLIF(btrim(COALESCE(p_idempotency_key, '')), '')
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_balance_id, v_next_qty, v_transaction_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9) Compatibility view for requested naming: work_order_parts_used
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.work_order_parts_used AS
SELECT
  wpu.id,
  wpu.work_order_id,
  wpu.product_id,
  wpu.quantity_used,
  wpu.notes,
  wpu.created_at
FROM public.work_order_part_usage wpu;
