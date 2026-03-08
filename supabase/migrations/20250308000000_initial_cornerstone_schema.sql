-- Cornerstone ERP — Initial PostgreSQL schema (Supabase-compatible)
-- Multi-tenant: Company → Property → Building → Unit
-- Run once via Supabase CLI or Dashboard SQL editor.

-- ---------------------------------------------------------------------------
-- Trigger: keep updated_at in sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- companies (root tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  logo_url text,
  website text,
  email text,
  phone text,
  address text,
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_slug ON public.companies (slug) WHERE slug IS NOT NULL;

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- users (extends auth.users; id matches auth.users.id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- company_memberships (user ↔ company, with role)
-- ---------------------------------------------------------------------------
CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX idx_company_memberships_company_id ON public.company_memberships (company_id);
CREATE INDEX idx_company_memberships_user_id ON public.company_memberships (user_id);

CREATE TRIGGER set_company_memberships_updated_at
  BEFORE UPDATE ON public.company_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- properties (belong to company)
-- ---------------------------------------------------------------------------
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_company_id ON public.properties (company_id);

CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- buildings (belong to property)
-- ---------------------------------------------------------------------------
CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buildings_property_id ON public.buildings (property_id);

CREATE TRIGGER set_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- units (belong to building; building_id nullable for standalone units)
-- ---------------------------------------------------------------------------
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.buildings (id) ON DELETE CASCADE,
  name_or_number text NOT NULL,
  floor text,
  square_footage numeric(12, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_building_id ON public.units (building_id) WHERE building_id IS NOT NULL;

CREATE TRIGGER set_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customers (company-scoped; optional location links)
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  billing_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_company_id ON public.customers (company_id);
CREATE INDEX idx_customers_property_id ON public.customers (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_customers_building_id ON public.customers (building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_customers_unit_id ON public.customers (unit_id) WHERE unit_id IS NOT NULL;

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customer_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts (customer_id);

CREATE TRIGGER set_customer_contacts_updated_at
  BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- asset_categories (company-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_categories_company_id ON public.asset_categories (company_id);

CREATE TRIGGER set_asset_categories_updated_at
  BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- technicians (company-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  employee_id text,
  skills text[],
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_technicians_company_id ON public.technicians (company_id);
CREATE INDEX idx_technicians_is_active ON public.technicians (company_id, is_active) WHERE is_active = true;

CREATE TRIGGER set_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vendors (company-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  service_types text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_company_id ON public.vendors (company_id);

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assets (company + optional location + optional category)
-- ---------------------------------------------------------------------------
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  asset_category_id uuid REFERENCES public.asset_categories (id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_type text,
  serial_number text,
  location text,
  install_date date,
  warranty_expires date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_company_id ON public.assets (company_id);
CREATE INDEX idx_assets_property_id ON public.assets (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_assets_building_id ON public.assets (building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_assets_unit_id ON public.assets (unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_assets_asset_category_id ON public.assets (asset_category_id) WHERE asset_category_id IS NOT NULL;

CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- work_orders (company + optional location, customer, asset, vendor)
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'draft', 'open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_orders_company_id ON public.work_orders (company_id);
CREATE INDEX idx_work_orders_status ON public.work_orders (company_id, status);
CREATE INDEX idx_work_orders_property_id ON public.work_orders (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_work_orders_building_id ON public.work_orders (building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_work_orders_unit_id ON public.work_orders (unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_work_orders_customer_id ON public.work_orders (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_work_orders_asset_id ON public.work_orders (asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_work_orders_vendor_id ON public.work_orders (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_work_orders_due_date ON public.work_orders (due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER set_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- work_order_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_order_tasks_work_order_id ON public.work_order_tasks (work_order_id);

CREATE TRIGGER set_work_order_tasks_updated_at
  BEFORE UPDATE ON public.work_order_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- work_order_notes
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_order_notes_work_order_id ON public.work_order_notes (work_order_id);
CREATE INDEX idx_work_order_notes_created_by_id ON public.work_order_notes (created_by_id) WHERE created_by_id IS NOT NULL;

CREATE TRIGGER set_work_order_notes_updated_at
  BEFORE UPDATE ON public.work_order_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- technician_assignments (many-to-many: technicians ↔ work_orders)
-- ---------------------------------------------------------------------------
CREATE TABLE public.technician_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, technician_id)
);

CREATE INDEX idx_technician_assignments_work_order_id ON public.technician_assignments (work_order_id);
CREATE INDEX idx_technician_assignments_technician_id ON public.technician_assignments (technician_id);

CREATE TRIGGER set_technician_assignments_updated_at
  BEFORE UPDATE ON public.technician_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contracts (company, customer; optional vendor and location/asset)
-- ---------------------------------------------------------------------------
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings (id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  name text NOT NULL,
  contract_type text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  start_date date,
  end_date date,
  value numeric(14, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_company_id ON public.contracts (company_id);
CREATE INDEX idx_contracts_status ON public.contracts (company_id, status);
CREATE INDEX idx_contracts_customer_id ON public.contracts (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_contracts_vendor_id ON public.contracts (vendor_id) WHERE vendor_id IS NOT NULL;

CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices (company; optional customer, work_order, contract)
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.work_orders (id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts (id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date,
  paid_at timestamptz,
  subtotal numeric(14, 2),
  tax numeric(14, 2),
  total numeric(14, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_invoices_company_invoice_number ON public.invoices (company_id, invoice_number);

CREATE INDEX idx_invoices_company_id ON public.invoices (company_id);
CREATE INDEX idx_invoices_status ON public.invoices (company_id, status);
CREATE INDEX idx_invoices_customer_id ON public.invoices (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_invoices_work_order_id ON public.invoices (work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX idx_invoices_due_date ON public.invoices (due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12, 4) NOT NULL DEFAULT 1,
  unit_price numeric(14, 2) NOT NULL,
  amount numeric(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items (invoice_id);

CREATE TRIGGER set_invoice_line_items_updated_at
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_items (company; optional preferred vendor)
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  quantity numeric(14, 4) NOT NULL DEFAULT 0,
  unit text,
  min_quantity numeric(14, 4),
  location text,
  cost numeric(14, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_company_id ON public.inventory_items (company_id);
CREATE INDEX idx_inventory_items_vendor_id ON public.inventory_items (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_inventory_items_sku ON public.inventory_items (company_id, sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_transactions (audit trail for stock movements)
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items (id) ON DELETE CASCADE,
  quantity_delta numeric(14, 4) NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'adjustment', 'receipt', 'issue', 'transfer_in', 'transfer_out', 'return'
  )),
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_transactions_inventory_item_id ON public.inventory_transactions (inventory_item_id);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions (inventory_item_id, created_at DESC);

CREATE TRIGGER set_inventory_transactions_updated_at
  BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- purchase_orders (company + vendor)
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
  order_date date,
  expected_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_purchase_orders_company_po_number ON public.purchase_orders (company_id, po_number);

CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders (company_id);
CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders (vendor_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders (company_id, status);

CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- purchase_order_lines
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14, 4) NOT NULL,
  unit_price numeric(14, 2),
  received_quantity numeric(14, 4) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_order_lines_purchase_order_id ON public.purchase_order_lines (purchase_order_id);
CREATE INDEX idx_purchase_order_lines_inventory_item_id ON public.purchase_order_lines (inventory_item_id) WHERE inventory_item_id IS NOT NULL;

CREATE TRIGGER set_purchase_order_lines_updated_at
  BEFORE UPDATE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pm_plans (preventive maintenance — tied to asset)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pm_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_plans_asset_id ON public.pm_plans (asset_id);
CREATE INDEX idx_pm_plans_is_active ON public.pm_plans (asset_id, is_active) WHERE is_active = true;

CREATE TRIGGER set_pm_plans_updated_at
  BEFORE UPDATE ON public.pm_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pm_schedule_rules (when to run PM — e.g. every N days, monthly, by meter)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pm_schedule_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_plan_id uuid NOT NULL REFERENCES public.pm_plans (id) ON DELETE CASCADE,
  schedule_type text NOT NULL CHECK (schedule_type IN ('interval_days', 'interval_weeks', 'monthly', 'quarterly', 'yearly')),
  interval_value int,
  day_of_month int CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_schedule_rules_pm_plan_id ON public.pm_schedule_rules (pm_plan_id);

CREATE TRIGGER set_pm_schedule_rules_updated_at
  BEFORE UPDATE ON public.pm_schedule_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
