-- Launch Estimator lead capture for CRM / sales follow-up

CREATE TABLE IF NOT EXISTS public.launch_estimator_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text NOT NULL,
  email text NOT NULL,
  phone text,
  industry text,
  branch_count text,
  truck_count integer,
  daily_jobs integer,
  dispatcher_count integer,
  integration_count integer,
  integrations jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_implementation integer,
  estimated_implementation_label text,
  complexity text,
  timeline text,
  custom_planning_recommended boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_launch_estimator_leads_created_at ON public.launch_estimator_leads (created_at DESC);
CREATE INDEX idx_launch_estimator_leads_email ON public.launch_estimator_leads (email);

COMMENT ON TABLE public.launch_estimator_leads IS 'Qualified leads from Fleet Intelligence Launch Estimator with full scoping payload.';

ALTER TABLE public.launch_estimator_leads ENABLE ROW LEVEL SECURITY;
