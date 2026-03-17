-- Platform infrastructure extensions:
-- 1) Global audit logs
-- 2) Onboarding completion marker
--
-- NOTE:
-- The notifications table is now defined in 20260315000000_saas_foundation.sql
-- with a richer schema (company_id, event_type, title, entity references, etc.).
-- To avoid conflicting definitions, this migration no longer creates
-- public.notifications. Run the SaaS foundation migration to create it.

-- ---------------------------------------------------------------------------
-- 1) Global audit logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON public.audit_logs ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs (user_id, "timestamp" DESC)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Onboarding completion marker
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
