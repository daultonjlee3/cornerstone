-- Sprint 5A enterprise integration infrastructure foundation

-- Expand integration provider catalog without replacing existing tables.
ALTER TABLE public.integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_provider_check;

ALTER TABLE public.integration_connections
  ADD CONSTRAINT integration_connections_provider_check
  CHECK (
    provider IN (
      'csv_manual',
      'samsara',
      'webhook_jobs',
      'webhook_telematics',
      'geotab',
      'motive',
      'fleetio',
      'quickbooks',
      'rest_api',
      'webhook'
    )
  );

CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  sync_run_id uuid REFERENCES public.integration_sync_runs (id) ON DELETE SET NULL,
  provider text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL CHECK (status IN ('info', 'success', 'warning', 'error')),
  duration_ms int CHECK (duration_ms IS NULL OR duration_ms >= 0),
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  retryable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_tenant_created
  ON public.integration_sync_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_sync_run
  ON public.integration_sync_logs (sync_run_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_connection_status
  ON public.integration_sync_logs (connection_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_provider
  ON public.integration_sync_logs (provider, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  object_type text NOT NULL CHECK (object_type IN (
    'branches', 'trucks', 'operators', 'jobs', 'customers', 'sites', 'equipment'
  )),
  provider text NOT NULL DEFAULT 'generic',
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, object_type, name)
);

CREATE INDEX IF NOT EXISTS idx_integration_mapping_templates_tenant
  ON public.integration_mapping_templates (tenant_id, object_type, provider);

CREATE TRIGGER set_integration_mapping_templates_updated_at
  BEFORE UPDATE ON public.integration_mapping_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.integration_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('csv', 'spreadsheet', 'rest', 'webhook', 'manual')),
  object_type text NOT NULL CHECK (object_type IN (
    'branches', 'trucks', 'operators', 'jobs', 'customers', 'sites', 'equipment'
  )),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'validated', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  mapping_template_id uuid REFERENCES public.integration_mapping_templates (id) ON DELETE SET NULL,
  total_rows int NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  imported_rows int NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  warning_rows int NOT NULL DEFAULT 0 CHECK (warning_rows >= 0),
  error_rows int NOT NULL DEFAULT 0 CHECK (error_rows >= 0),
  duplicate_rows int NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  skipped_rows int NOT NULL DEFAULT 0 CHECK (skipped_rows >= 0),
  runtime_ms int CHECK (runtime_ms IS NULL OR runtime_ms >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_import_batches_tenant_status_created
  ON public.integration_import_batches (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_import_batches_connection
  ON public.integration_import_batches (connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_import_batches_object_type
  ON public.integration_import_batches (tenant_id, object_type, created_at DESC);

CREATE TRIGGER set_integration_import_batches_updated_at
  BEFORE UPDATE ON public.integration_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.integration_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES public.integration_import_batches (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  row_number int NOT NULL CHECK (row_number > 0),
  status text NOT NULL CHECK (status IN ('pending', 'valid', 'warning', 'error', 'imported', 'skipped', 'duplicate')),
  external_id text,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_integration_import_rows_batch_status
  ON public.integration_import_rows (import_batch_id, status, row_number);
CREATE INDEX IF NOT EXISTS idx_integration_import_rows_tenant
  ON public.integration_import_rows (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.integration_import_rows_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.integration_import_batches
  WHERE id = NEW.import_batch_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid import_batch_id';
  END IF;

  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_import_rows_tenant_guard ON public.integration_import_rows;
CREATE TRIGGER trg_integration_import_rows_tenant_guard
  BEFORE INSERT OR UPDATE OF import_batch_id ON public.integration_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.integration_import_rows_tenant_guard_fn();

CREATE TABLE IF NOT EXISTS public.integration_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.integration_mapping_templates (id) ON DELETE SET NULL,
  object_type text NOT NULL CHECK (object_type IN (
    'branches', 'trucks', 'operators', 'jobs', 'customers', 'sites', 'equipment'
  )),
  source_field text NOT NULL,
  target_field text NOT NULL,
  transform_key text,
  required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_field_mappings_tenant_object
  ON public.integration_field_mappings (tenant_id, object_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_field_mappings_connection
  ON public.integration_field_mappings (connection_id, object_type, source_field);
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_field_mappings_template_field
  ON public.integration_field_mappings (template_id, source_field, target_field)
  WHERE template_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_field_mappings_connection_field
  ON public.integration_field_mappings (connection_id, object_type, source_field, target_field)
  WHERE connection_id IS NOT NULL AND template_id IS NULL;

CREATE TRIGGER set_integration_field_mappings_updated_at
  BEFORE UPDATE ON public.integration_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.integration_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_key text,
  event_hash text,
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'partial', 'failed', 'duplicate')),
  error_message text,
  sync_run_id uuid REFERENCES public.integration_sync_runs (id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_webhook_events_connection_event_key
  ON public.integration_webhook_events (connection_id, event_key)
  WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_tenant_status_received
  ON public.integration_webhook_events (tenant_id, status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_provider
  ON public.integration_webhook_events (provider, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_sync_run
  ON public.integration_webhook_events (sync_run_id);

CREATE TABLE IF NOT EXISTS public.integration_webhook_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  webhook_event_id uuid NOT NULL REFERENCES public.integration_webhook_events (id) ON DELETE CASCADE,
  sync_run_id uuid REFERENCES public.integration_sync_runs (id) ON DELETE SET NULL,
  attempt_no int NOT NULL CHECK (attempt_no > 0),
  status text NOT NULL CHECK (status IN ('processing', 'success', 'failed')),
  error_message text,
  duration_ms int CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webhook_event_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_integration_webhook_delivery_attempts_tenant_status
  ON public.integration_webhook_delivery_attempts (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_delivery_attempts_event
  ON public.integration_webhook_delivery_attempts (webhook_event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_delivery_attempts_sync_run
  ON public.integration_webhook_delivery_attempts (sync_run_id);

CREATE OR REPLACE FUNCTION public.integration_webhook_delivery_attempts_tenant_guard_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.integration_webhook_events
  WHERE id = NEW.webhook_event_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid webhook_event_id';
  END IF;

  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_webhook_delivery_attempts_tenant_guard
  ON public.integration_webhook_delivery_attempts;
CREATE TRIGGER trg_integration_webhook_delivery_attempts_tenant_guard
  BEFORE INSERT OR UPDATE OF webhook_event_id ON public.integration_webhook_delivery_attempts
  FOR EACH ROW EXECUTE FUNCTION public.integration_webhook_delivery_attempts_tenant_guard_fn();

CREATE TABLE IF NOT EXISTS public.integration_readiness_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_readiness_issues_open_code
  ON public.integration_readiness_issues (tenant_id, code)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_integration_readiness_issues_tenant_status
  ON public.integration_readiness_issues (tenant_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_readiness_issues_created
  ON public.integration_readiness_issues (created_at DESC);

CREATE TRIGGER set_integration_readiness_issues_updated_at
  BEFORE UPDATE ON public.integration_readiness_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_readiness_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_sync_logs_tenant_isolation ON public.integration_sync_logs
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_mapping_templates_tenant_isolation ON public.integration_mapping_templates
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_import_batches_tenant_isolation ON public.integration_import_batches
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_import_rows_tenant_isolation ON public.integration_import_rows
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_field_mappings_tenant_isolation ON public.integration_field_mappings
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_webhook_events_tenant_isolation ON public.integration_webhook_events
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_webhook_delivery_attempts_tenant_isolation
  ON public.integration_webhook_delivery_attempts
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));

CREATE POLICY integration_readiness_issues_tenant_isolation ON public.integration_readiness_issues
  FOR ALL USING (public.current_user_has_tenant(tenant_id))
  WITH CHECK (public.current_user_has_tenant(tenant_id));
