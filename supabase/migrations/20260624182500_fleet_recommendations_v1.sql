-- Fleet Intelligence Sprint 4 — recommendation instances + outcomes

-- ---------------------------------------------------------------------------
-- 1) recommendation_instances
-- ---------------------------------------------------------------------------
CREATE TABLE public.recommendation_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  recommendation_type text NOT NULL
    CHECK (recommendation_type IN ('truck_assignment', 'capacity_overload', 'idle_truck_match')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired')),
  score numeric(6, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_recommendation_instances_tenant_status_created
  ON public.recommendation_instances (tenant_id, status, created_at DESC);

CREATE INDEX idx_recommendation_instances_branch_status
  ON public.recommendation_instances (branch_id, status, created_at DESC);

CREATE INDEX idx_recommendation_instances_expires
  ON public.recommendation_instances (tenant_id, expires_at);

CREATE OR REPLACE FUNCTION public.recommendation_instances_branch_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.branches
  WHERE id = NEW.branch_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid branch_id for recommendation_instance';
  END IF;

  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recommendation_instances_branch_tenant_guard
  BEFORE INSERT OR UPDATE OF branch_id
  ON public.recommendation_instances
  FOR EACH ROW EXECUTE FUNCTION public.recommendation_instances_branch_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 2) recommendation_outcomes
-- ---------------------------------------------------------------------------
CREATE TABLE public.recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL
    REFERENCES public.recommendation_instances (id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('accepted', 'dismissed', 'expired')),
  acted_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  acted_at timestamptz NOT NULL DEFAULT now(),
  estimated_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text
);

CREATE INDEX idx_recommendation_outcomes_recommendation
  ON public.recommendation_outcomes (recommendation_id, acted_at DESC);

CREATE INDEX idx_recommendation_outcomes_action
  ON public.recommendation_outcomes (action, acted_at DESC);

-- ---------------------------------------------------------------------------
-- 3) Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.recommendation_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendation_instances_tenant_isolation ON public.recommendation_instances
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY recommendation_outcomes_tenant_isolation ON public.recommendation_outcomes
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.recommendation_instances ri
      WHERE ri.id = recommendation_id
        AND public.current_user_has_tenant(ri.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recommendation_instances ri
      WHERE ri.id = recommendation_id
        AND public.current_user_has_tenant(ri.tenant_id)
    )
  );
