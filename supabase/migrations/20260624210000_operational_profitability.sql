-- Operational Profitability bounded context — extends Fleet Intelligence (not ERP)

-- ---------------------------------------------------------------------------
-- 1) Company operating rules (labor + variable cost defaults)
-- ---------------------------------------------------------------------------
CREATE TABLE public.company_operating_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  regular_hours_per_day numeric(6, 2) NOT NULL DEFAULT 8 CHECK (regular_hours_per_day > 0),
  regular_hours_per_week numeric(6, 2) NOT NULL DEFAULT 40 CHECK (regular_hours_per_week > 0),
  daily_overtime_threshold numeric(6, 2) NOT NULL DEFAULT 8 CHECK (daily_overtime_threshold >= 0),
  weekly_overtime_threshold numeric(6, 2) NOT NULL DEFAULT 40 CHECK (weekly_overtime_threshold >= 0),
  overtime_multiplier numeric(4, 2) NOT NULL DEFAULT 1.5 CHECK (overtime_multiplier >= 1),
  double_time_threshold numeric(6, 2),
  double_time_multiplier numeric(4, 2) NOT NULL DEFAULT 2 CHECK (double_time_multiplier >= 1),
  saturday_multiplier numeric(4, 2) NOT NULL DEFAULT 1.5 CHECK (saturday_multiplier >= 1),
  sunday_multiplier numeric(4, 2) NOT NULL DEFAULT 2 CHECK (sunday_multiplier >= 1),
  holiday_multiplier numeric(4, 2) NOT NULL DEFAULT 2 CHECK (holiday_multiplier >= 1),
  night_shift_premium numeric(4, 3) NOT NULL DEFAULT 0.15 CHECK (night_shift_premium >= 0),
  travel_time_pay_multiplier numeric(4, 2) NOT NULL DEFAULT 1 CHECK (travel_time_pay_multiplier >= 0),
  default_operator_hourly_rate numeric(10, 2) NOT NULL DEFAULT 45 CHECK (default_operator_hourly_rate >= 0),
  fuel_cost_per_mile numeric(8, 4) NOT NULL DEFAULT 0.85 CHECK (fuel_cost_per_mile >= 0),
  idle_cost_per_hour numeric(10, 2) NOT NULL DEFAULT 35 CHECK (idle_cost_per_hour >= 0),
  truck_fixed_cost_per_hour numeric(10, 2) NOT NULL DEFAULT 28 CHECK (truck_fixed_cost_per_hour >= 0),
  custom_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE INDEX idx_company_operating_rules_tenant ON public.company_operating_rules (tenant_id);

CREATE TRIGGER set_company_operating_rules_updated_at
  BEFORE UPDATE ON public.company_operating_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.company_operating_rules IS
  'Operational profitability rules — labor overtime, fuel, idle. Not GL/payroll.';

-- ---------------------------------------------------------------------------
-- 2) Truck cost profiles (optional per-truck overrides)
-- ---------------------------------------------------------------------------
CREATE TABLE public.truck_cost_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks (id) ON DELETE CASCADE,
  truck_type text,
  fuel_cost_per_mile numeric(8, 4),
  idle_cost_per_hour numeric(10, 2),
  fixed_cost_per_hour numeric(10, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (truck_id IS NOT NULL OR truck_type IS NOT NULL)
);

CREATE INDEX idx_truck_cost_profiles_tenant ON public.truck_cost_profiles (tenant_id);
CREATE UNIQUE INDEX uq_truck_cost_profiles_truck ON public.truck_cost_profiles (truck_id)
  WHERE truck_id IS NOT NULL;
CREATE UNIQUE INDEX uq_truck_cost_profiles_type ON public.truck_cost_profiles (company_id, truck_type)
  WHERE truck_id IS NULL AND truck_type IS NOT NULL;

CREATE TRIGGER set_truck_cost_profiles_updated_at
  BEFORE UPDATE ON public.truck_cost_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Extend fleet_operators
-- ---------------------------------------------------------------------------
ALTER TABLE public.fleet_operators
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS truck_qualifications text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS overtime_rate numeric(12, 2),
  ADD COLUMN IF NOT EXISTS double_time_rate numeric(12, 2);

-- ---------------------------------------------------------------------------
-- 4) Extend fleet_jobs — deterministic estimate columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.fleet_jobs
  ADD COLUMN IF NOT EXISTS assigned_operator_id uuid REFERENCES public.fleet_operators (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_labor_cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_fuel_cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_deadhead_cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_variable_cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_contribution numeric(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_margin_pct numeric(6, 2);

CREATE INDEX IF NOT EXISTS idx_fleet_jobs_assigned_operator
  ON public.fleet_jobs (assigned_operator_id) WHERE assigned_operator_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5) Extend utilization_daily mart with cost / contribution
-- ---------------------------------------------------------------------------
ALTER TABLE public.utilization_daily
  ADD COLUMN IF NOT EXISTS labor_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  ADD COLUMN IF NOT EXISTS fuel_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (fuel_cost >= 0),
  ADD COLUMN IF NOT EXISTS deadhead_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (deadhead_cost >= 0),
  ADD COLUMN IF NOT EXISTS idle_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (idle_cost >= 0),
  ADD COLUMN IF NOT EXISTS variable_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (variable_cost >= 0),
  ADD COLUMN IF NOT EXISTS contribution numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_pct numeric(6, 2),
  ADD COLUMN IF NOT EXISTS overtime_cost numeric(12, 2) NOT NULL DEFAULT 0 CHECK (overtime_cost >= 0);

COMMENT ON COLUMN public.utilization_daily.contribution IS
  'Revenue minus variable operational cost (labor + fuel + deadhead + idle) — not accounting margin';

-- ---------------------------------------------------------------------------
-- 6) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.company_operating_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_cost_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_operating_rules_tenant ON public.company_operating_rules
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY truck_cost_profiles_tenant ON public.truck_cost_profiles
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));
