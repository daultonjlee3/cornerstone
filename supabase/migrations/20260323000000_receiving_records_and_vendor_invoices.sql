-- Receiving records (audit trail per receipt event) and vendor invoice matching.
-- Extends existing PO receiving and inventory transactions.

-- -----------------------------------------------------------------------------
-- 1) Purchase receipts (one per receipt event)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  received_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  stock_location_id uuid NOT NULL REFERENCES public.stock_locations (id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po ON public.purchase_receipts (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_date ON public.purchase_receipts (received_date DESC);

-- -----------------------------------------------------------------------------
-- 2) Purchase receipt lines (one per line received in that event)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.purchase_receipts (id) ON DELETE CASCADE,
  purchase_order_line_id uuid NOT NULL REFERENCES public.purchase_order_lines (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  quantity_received numeric(14, 4) NOT NULL,
  unit_cost_snapshot numeric(14, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_receipt_lines_positive_qty CHECK (quantity_received > 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_receipt ON public.purchase_receipt_lines (receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_po_line ON public.purchase_receipt_lines (purchase_order_line_id);

-- -----------------------------------------------------------------------------
-- 3) Vendor invoices (linked to PO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  purchase_order_id uuid REFERENCES public.purchase_orders (id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  invoice_total numeric(14, 2),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'matched', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_company ON public.vendor_invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor ON public.vendor_invoices (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_po ON public.vendor_invoices (purchase_order_id) WHERE purchase_order_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_vendor_invoices_updated_at ON public.vendor_invoices;
CREATE TRIGGER set_vendor_invoices_updated_at
  BEFORE UPDATE ON public.vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) Vendor invoice lines (link to PO line for matching)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_invoice_id uuid NOT NULL REFERENCES public.vendor_invoices (id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES public.purchase_order_lines (id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  quantity_invoiced numeric(14, 4) NOT NULL,
  unit_cost numeric(14, 2),
  line_total numeric(14, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_invoice_lines_non_negative_qty CHECK (quantity_invoiced >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoice_lines_invoice ON public.vendor_invoice_lines (vendor_invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoice_lines_po_line ON public.vendor_invoice_lines (purchase_order_line_id) WHERE purchase_order_line_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_vendor_invoice_lines_updated_at ON public.vendor_invoice_lines;
CREATE TRIGGER set_vendor_invoice_lines_updated_at
  BEFORE UPDATE ON public.vendor_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
