-- Work Request Portal core schema

CREATE TABLE IF NOT EXISTS public.work_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  location text NOT NULL,
  asset_id uuid REFERENCES public.assets (id) ON DELETE SET NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'emergency')),
  photo_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'approved',
      'rejected',
      'converted_to_work_order',
      'scheduled',
      'completed'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_requests_tenant_created
  ON public.work_requests (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_requests_status
  ON public.work_requests (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_requests_company
  ON public.work_requests (company_id, created_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_requests_asset
  ON public.work_requests (asset_id, created_at DESC)
  WHERE asset_id IS NOT NULL;

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.work_requests (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_request_id
  ON public.work_orders (request_id)
  WHERE request_id IS NOT NULL;
