-- Fleet Intelligence Sprint 3 — utilization_daily + branch_capacity_snapshots

-- ---------------------------------------------------------------------------
-- 1) utilization_daily mart
-- ---------------------------------------------------------------------------
CREATE TABLE public.utilization_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES public.trucks (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  date date NOT NULL,
  billable_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (billable_hours >= 0),
  idle_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (idle_hours >= 0),
  total_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  miles numeric(12, 2) NOT NULL DEFAULT 0 CHECK (miles >= 0),
  revenue numeric(12, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  deadhead_miles numeric(12, 2) NOT NULL DEFAULT 0 CHECK (deadhead_miles >= 0),
  committed_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (committed_hours >= 0),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (truck_id, date)
);

CREATE INDEX idx_utilization_daily_tenant_date
  ON public.utilization_daily (tenant_id, date DESC);

CREATE INDEX idx_utilization_daily_branch_date
  ON public.utilization_daily (branch_id, date DESC);

CREATE INDEX idx_utilization_daily_truck_date
  ON public.utilization_daily (truck_id, date DESC);

COMMENT ON TABLE public.utilization_daily IS
  'Derived daily truck utilization mart — UI reads this, not raw telematics_events';

COMMENT ON COLUMN public.utilization_daily.deadhead_miles IS
  'Heuristic deadhead miles (Haversine) — label as estimated in UI';

-- ---------------------------------------------------------------------------
-- 2) branch_capacity_snapshots mart
-- ---------------------------------------------------------------------------
CREATE TABLE public.branch_capacity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  date date NOT NULL,
  available_truck_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (available_truck_hours >= 0),
  committed_hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (committed_hours >= 0),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, date)
);

CREATE INDEX idx_branch_capacity_snapshots_tenant_date
  ON public.branch_capacity_snapshots (tenant_id, date DESC);

CREATE INDEX idx_branch_capacity_snapshots_branch_date
  ON public.branch_capacity_snapshots (branch_id, date DESC);

COMMENT ON TABLE public.branch_capacity_snapshots IS
  'Daily branch truck capacity vs committed hours for dispatch board';

-- ---------------------------------------------------------------------------
-- 3) tenant scope guards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.utilization_daily_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.trucks WHERE id = NEW.truck_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid truck_id for utilization_daily';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_utilization_daily_tenant_guard
  BEFORE INSERT OR UPDATE OF truck_id ON public.utilization_daily
  FOR EACH ROW EXECUTE FUNCTION public.utilization_daily_tenant_guard_fn();

CREATE OR REPLACE FUNCTION public.branch_capacity_snapshots_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.branches WHERE id = NEW.branch_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid branch_id for branch_capacity_snapshots';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_branch_capacity_snapshots_tenant_guard
  BEFORE INSERT OR UPDATE OF branch_id ON public.branch_capacity_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.branch_capacity_snapshots_tenant_guard_fn();

-- ---------------------------------------------------------------------------
-- 4) Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.utilization_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_capacity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY utilization_daily_tenant_isolation ON public.utilization_daily
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY branch_capacity_snapshots_tenant_isolation ON public.branch_capacity_snapshots
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));
