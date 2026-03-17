-- Demo guest sessions and lead capture for live demo access flow.
-- Adds demo_guest role and demo_leads table; no change to core auth.

-- ---------------------------------------------------------------------------
-- 1) Allow demo_guest role in tenant_memberships
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS chk_tenant_memberships_role;
ALTER TABLE public.tenant_memberships ADD CONSTRAINT chk_tenant_memberships_role
  CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'technician', 'demo_guest'));

-- ---------------------------------------------------------------------------
-- 2) demo_leads — store lead info when visitor enters demo (email, company, industry, timestamp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text,
  industry_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_leads_created_at ON public.demo_leads (created_at DESC);
CREATE INDEX idx_demo_leads_industry_slug ON public.demo_leads (industry_slug);

COMMENT ON TABLE public.demo_leads IS 'Lead capture when visitors enter live demo (industry selection + email capture).';
