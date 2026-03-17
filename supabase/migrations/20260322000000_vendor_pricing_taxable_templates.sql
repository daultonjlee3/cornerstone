-- Vendor price catalog, product taxable default, PO line taxable snapshot, and PO templates.
-- Extends existing procurement schema without breaking current flows.

-- -----------------------------------------------------------------------------
-- 1) Product default taxable
-- -----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS taxable_default boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.taxable_default IS 'Default taxability when no vendor override exists.';

-- -----------------------------------------------------------------------------
-- 2) Vendor pricing / price catalog (one row per vendor-product; no duplicates)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  vendor_item_name text,
  vendor_sku text,
  unit_cost numeric(14, 2) NOT NULL,
  taxable_override boolean,
  preferred boolean NOT NULL DEFAULT false,
  lead_time_days integer,
  notes text,
  effective_date date DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_pricing_unit_cost_non_negative CHECK (unit_cost >= 0),
  CONSTRAINT vendor_pricing_vendor_product_unique UNIQUE (vendor_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_pricing_vendor_id ON public.vendor_pricing (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pricing_product_id ON public.vendor_pricing (product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pricing_updated_at ON public.vendor_pricing (updated_at);

COMMENT ON COLUMN public.vendor_pricing.taxable_override IS 'NULL = use product default; true = taxable; false = non-taxable.';

DROP TRIGGER IF EXISTS set_vendor_pricing_updated_at ON public.vendor_pricing;
CREATE TRIGGER set_vendor_pricing_updated_at
  BEFORE UPDATE ON public.vendor_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) Purchase order line taxable snapshot
-- -----------------------------------------------------------------------------
ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS taxable_snapshot boolean;

COMMENT ON COLUMN public.purchase_order_lines.taxable_snapshot IS 'Taxable status at time of order; preserved for historical accuracy.';

-- -----------------------------------------------------------------------------
-- 4) Purchase order templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  name text NOT NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_templates_company_id ON public.purchase_order_templates (company_id);
CREATE INDEX IF NOT EXISTS idx_po_templates_vendor_id ON public.purchase_order_templates (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_templates_active ON public.purchase_order_templates (company_id, active) WHERE active = true;

DROP TRIGGER IF EXISTS set_po_templates_updated_at ON public.purchase_order_templates;
CREATE TRIGGER set_po_templates_updated_at
  BEFORE UPDATE ON public.purchase_order_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5) Purchase order template lines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_template_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.purchase_order_templates (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  default_quantity numeric(14, 4) NOT NULL,
  default_unit_cost numeric(14, 2),
  default_taxable boolean,
  description_snapshot text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_template_lines_quantity_positive CHECK (default_quantity > 0),
  CONSTRAINT po_template_lines_unit_cost_non_negative CHECK (default_unit_cost IS NULL OR default_unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_po_template_lines_template_id ON public.purchase_order_template_lines (template_id);

DROP TRIGGER IF EXISTS set_po_template_lines_updated_at ON public.purchase_order_template_lines;
CREATE TRIGGER set_po_template_lines_updated_at
  BEFORE UPDATE ON public.purchase_order_template_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
