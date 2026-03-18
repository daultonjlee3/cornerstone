-- AI usage metering: tenant-level quotas and per-request usage log.
-- Safe defaults; no dependency on external billing. Cost is source of truth; credits derived.

-- ---------------------------------------------------------------------------
-- 1) Tenant AI config (quota, limits, overage policy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  ai_enabled boolean NOT NULL DEFAULT true,
  monthly_included_cost_usd numeric(12, 6) NOT NULL DEFAULT 20,
  monthly_soft_limit_usd numeric(12, 6) NOT NULL DEFAULT 30,
  monthly_hard_limit_usd numeric(12, 6) NOT NULL DEFAULT 40,
  warning_threshold_percent integer NOT NULL DEFAULT 80 CHECK (warning_threshold_percent >= 1 AND warning_threshold_percent <= 99),
  overage_policy text NOT NULL DEFAULT 'DEGRADE_TO_LIGHT' CHECK (overage_policy IN ('ALLOW_FULL', 'DEGRADE_TO_LIGHT', 'BLOCK')),
  light_model_only_over_soft_limit boolean NOT NULL DEFAULT true,
  included_credits_monthly integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),
  CONSTRAINT chk_ai_limits CHECK (
    monthly_hard_limit_usd >= monthly_soft_limit_usd
    AND monthly_soft_limit_usd >= monthly_included_cost_usd
    AND monthly_included_cost_usd >= 0
  )
);

CREATE INDEX idx_tenant_ai_config_tenant_id ON public.tenant_ai_config (tenant_id);

CREATE TRIGGER set_tenant_ai_config_updated_at
  BEFORE UPDATE ON public.tenant_ai_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.tenant_ai_config IS 'Per-tenant AI quota and overage policy. Cost limits are source of truth.';

-- ---------------------------------------------------------------------------
-- 2) AI usage log (per request)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  feature_key text NOT NULL,
  request_id text,
  trace_id text,
  provider text NOT NULL,
  model text NOT NULL,
  mode text NOT NULL DEFAULT 'FULL' CHECK (mode IN ('FULL', 'LIGHT')),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cached_tokens integer,
  estimated_input_cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
  estimated_output_cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
  estimated_total_cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
  credits_used numeric(12, 4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'BLOCKED', 'DEGRADED', 'ERROR')),
  block_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_log_tenant_created ON public.ai_usage_log (tenant_id, created_at DESC);
CREATE UNIQUE INDEX idx_ai_usage_log_request_id_unique ON public.ai_usage_log (request_id) WHERE request_id IS NOT NULL AND request_id <> '';

COMMENT ON TABLE public.ai_usage_log IS 'Per-request AI usage for metering and cost aggregation. request_id supports idempotency.';
