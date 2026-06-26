-- Operator time off, hours tracking, recommendation lifecycle, dispatch signals
-- Safe to re-run. Run the full file in Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Step 1: New tables (operator PTO, hours, dispatch signals)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fleet_operator_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.fleet_operators (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleet_operator_time_off_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_fleet_operator_time_off_tenant
  ON public.fleet_operator_time_off (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_operator_time_off_operator_dates
  ON public.fleet_operator_time_off (operator_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS public.fleet_operator_hours_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.fleet_operators (id) ON DELETE CASCADE,
  date date NOT NULL,
  committed_hours numeric(8, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, date)
);

CREATE INDEX IF NOT EXISTS idx_fleet_operator_hours_daily_tenant_date
  ON public.fleet_operator_hours_daily (tenant_id, date);

CREATE TABLE IF NOT EXISTS public.fleet_dispatch_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_dispatch_signals_tenant_created
  ON public.fleet_dispatch_signals (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Step 2: Recommendation lifecycle column (only if table exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'recommendation_instances'
  ) THEN
    ALTER TABLE public.recommendation_instances
      ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'draft';

    ALTER TABLE public.recommendation_instances
      DROP CONSTRAINT IF EXISTS recommendation_instances_lifecycle_check;

    ALTER TABLE public.recommendation_instances
      ADD CONSTRAINT recommendation_instances_lifecycle_check
      CHECK (
        lifecycle IN (
          'draft',
          'validating',
          'ready',
          'displayed',
          'accepted',
          'rejected',
          'expired',
          'failed'
        )
      );

    CREATE INDEX IF NOT EXISTS idx_recommendation_instances_lifecycle
      ON public.recommendation_instances (tenant_id, lifecycle)
      WHERE status = 'pending';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 3: Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.fleet_operator_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_operator_hours_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_dispatch_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleet_operator_time_off_tenant_isolation ON public.fleet_operator_time_off;
CREATE POLICY fleet_operator_time_off_tenant_isolation ON public.fleet_operator_time_off
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

DROP POLICY IF EXISTS fleet_operator_hours_daily_tenant_isolation ON public.fleet_operator_hours_daily;
CREATE POLICY fleet_operator_hours_daily_tenant_isolation ON public.fleet_operator_hours_daily
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

DROP POLICY IF EXISTS fleet_dispatch_signals_tenant_isolation ON public.fleet_dispatch_signals;
CREATE POLICY fleet_dispatch_signals_tenant_isolation ON public.fleet_dispatch_signals
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));
