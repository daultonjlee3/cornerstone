-- Fleet Intelligence Sprint 2 — telematics_events, truck_latest_position, append-only guards

-- ---------------------------------------------------------------------------
-- 1) trucks.last_telematics_at
-- ---------------------------------------------------------------------------
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS last_telematics_at timestamptz;

COMMENT ON COLUMN public.trucks.last_telematics_at IS
  'Denormalized timestamp of latest telematics_events.recorded_at for this truck';

CREATE INDEX IF NOT EXISTS idx_trucks_last_telematics_at
  ON public.trucks (tenant_id, last_telematics_at DESC NULLS LAST)
  WHERE last_telematics_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) telematics_events (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.telematics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES public.trucks (id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL,
  latitude double precision NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude double precision NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  speed_mph numeric(8, 2),
  odometer_miles numeric(12, 2),
  engine_on boolean,
  idle boolean,
  heading_deg numeric(6, 2),
  source text NOT NULL CHECK (source IN ('samsara', 'webhook_telematics', 'csv_manual', 'backfill')),
  external_event_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telematics_events_truck_recorded
  ON public.telematics_events (truck_id, recorded_at DESC);

CREATE INDEX idx_telematics_events_tenant_recorded
  ON public.telematics_events (tenant_id, recorded_at DESC);

CREATE UNIQUE INDEX uq_telematics_events_connection_external
  ON public.telematics_events (connection_id, external_event_id)
  WHERE connection_id IS NOT NULL AND external_event_id IS NOT NULL AND external_event_id <> '';

CREATE OR REPLACE FUNCTION public.telematics_events_truck_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.trucks WHERE id = NEW.truck_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid truck_id for telematics_event';
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_telematics_events_truck_tenant_guard
  BEFORE INSERT ON public.telematics_events
  FOR EACH ROW EXECUTE FUNCTION public.telematics_events_truck_tenant_guard_fn();

CREATE OR REPLACE FUNCTION public.telematics_events_append_only_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'telematics_events is append-only';
END;
$$;

CREATE TRIGGER trg_telematics_events_no_update
  BEFORE UPDATE ON public.telematics_events
  FOR EACH ROW EXECUTE FUNCTION public.telematics_events_append_only_fn();

CREATE TRIGGER trg_telematics_events_no_delete
  BEFORE DELETE ON public.telematics_events
  FOR EACH ROW EXECUTE FUNCTION public.telematics_events_append_only_fn();

-- ---------------------------------------------------------------------------
-- 3) truck_latest_position view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.truck_latest_position
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (truck_id)
  truck_id,
  tenant_id,
  recorded_at,
  latitude,
  longitude,
  speed_mph,
  engine_on,
  idle,
  source
FROM public.telematics_events
ORDER BY truck_id, recorded_at DESC;

COMMENT ON VIEW public.truck_latest_position IS
  'Latest GPS position per truck; read via fleet queries, not raw joins in UI';

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.telematics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY telematics_events_select_tenant ON public.telematics_events
  FOR SELECT USING (public.current_user_has_tenant(tenant_id));

-- Inserts from service role bypass RLS; authenticated users cannot insert directly.

-- ---------------------------------------------------------------------------
-- 5) Update last_telematics_at on insert (only when newer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trucks_update_last_telematics_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.trucks
  SET last_telematics_at = NEW.recorded_at
  WHERE id = NEW.truck_id
    AND (last_telematics_at IS NULL OR last_telematics_at < NEW.recorded_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_telematics_events_update_truck_last_at
  AFTER INSERT ON public.telematics_events
  FOR EACH ROW EXECUTE FUNCTION public.trucks_update_last_telematics_fn();
