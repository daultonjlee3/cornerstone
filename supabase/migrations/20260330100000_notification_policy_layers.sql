-- Layered notification policy: company rules, nullable role overrides, per-event user prefs,
-- audience scopes on event types, push default column.

-- ---------------------------------------------------------------------------
-- 1) Extend notification_event_types
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_event_types
  ADD COLUMN IF NOT EXISTS default_push boolean NOT NULL DEFAULT false;

ALTER TABLE public.notification_event_types
  ADD COLUMN IF NOT EXISTS audience_scopes text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.notification_event_types.default_push IS 'Default push channel when implemented; UI shows toggle.';
COMMENT ON COLUMN public.notification_event_types.audience_scopes IS 'Who may receive this event (dispatch expands recipients; policy is documentation + future enforcement).';

-- ---------------------------------------------------------------------------
-- 2) Company-level overrides (per company, per event)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_company_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  event_type text NOT NULL REFERENCES public.notification_event_types (code) ON DELETE CASCADE,
  enabled boolean,
  in_app boolean,
  email boolean,
  sms boolean,
  push boolean,
  audience_scopes text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_company_rules_tenant ON public.notification_company_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_company_rules_company ON public.notification_company_rules (company_id);

DROP TRIGGER IF EXISTS set_notification_company_rules_updated_at ON public.notification_company_rules;
CREATE TRIGGER set_notification_company_rules_updated_at
  BEFORE UPDATE ON public.notification_company_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_company_rules IS 'Company overrides on top of notification_event_types; NULL = inherit.';
COMMENT ON COLUMN public.notification_company_rules.enabled IS 'NULL inherit; false disables this event for the company.';

-- ---------------------------------------------------------------------------
-- 3) Per-user per-event channel overrides (NULL = inherit from role/company/type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_user_event_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  event_type text NOT NULL REFERENCES public.notification_event_types (code) ON DELETE CASCADE,
  in_app boolean,
  email boolean,
  sms boolean,
  push boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_user_event_prefs_user ON public.notification_user_event_preferences (user_id);

DROP TRIGGER IF EXISTS set_notification_user_event_preferences_updated_at ON public.notification_user_event_preferences;
CREATE TRIGGER set_notification_user_event_preferences_updated_at
  BEFORE UPDATE ON public.notification_user_event_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_user_event_preferences IS 'User channel overrides per event; NULL per channel = inherit from role/company defaults.';

-- ---------------------------------------------------------------------------
-- 4) Role rules: optional company scope + nullable fields (inherit)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_rules
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE;

ALTER TABLE public.notification_rules DROP CONSTRAINT IF EXISTS notification_rules_tenant_id_role_event_type_key;

ALTER TABLE public.notification_rules
  ALTER COLUMN in_app DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN sms DROP NOT NULL,
  ALTER COLUMN enabled DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_rules_global_unique
  ON public.notification_rules (tenant_id, role, event_type)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_rules_company_unique
  ON public.notification_rules (tenant_id, role, event_type, company_id)
  WHERE company_id IS NOT NULL;

COMMENT ON COLUMN public.notification_rules.company_id IS 'NULL = tenant-wide default for role; set = override for that company only.';
COMMENT ON COLUMN public.notification_rules.in_app IS 'NULL = inherit from company policy / event type defaults.';

-- ---------------------------------------------------------------------------
-- 5) Seed / refresh event types (codes align with app + dispatch)
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_event_types (code, name, category, default_in_app, default_email, default_sms, default_push, audience_scopes)
VALUES
  ('work_order.created', 'Work order created', 'work_orders', true, false, false, false,
    ARRAY['dispatch_roles', 'managers']::text[]),
  ('work_order.assigned', 'Work order assigned', 'assignments', true, true, true, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles']::text[]),
  ('work_order.reassigned', 'Work order reassigned', 'assignments', true, true, true, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles']::text[]),
  ('work_order.schedule_changed', 'Work order schedule changed', 'work_orders', true, true, false, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles']::text[]),
  ('work_order.status_changed', 'Work order status changed', 'work_orders', true, false, false, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles', 'managers']::text[]),
  ('work_order.due_soon', 'Work order due soon', 'overdue', true, true, false, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles']::text[]),
  ('work_order.overdue', 'Work order overdue', 'overdue', true, true, false, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles', 'managers']::text[]),
  ('work_order.completed', 'Work order completed', 'completions', true, false, false, false,
    ARRAY['managers', 'requestor', 'dispatch_roles']::text[]),
  ('work_order.comment', 'Work order note or comment added', 'completions', true, false, false, false,
    ARRAY['assigned_user', 'assigned_crew_members', 'dispatch_roles']::text[]),
  ('work_order.emergency_created', 'Emergency work order created', 'work_orders', true, true, true, false,
    ARRAY['dispatch_roles', 'managers', 'admins']::text[]),
  ('work_order.vendor_assigned', 'Vendor assigned to work order', 'assignments', true, true, false, false,
    ARRAY['dispatch_roles', 'managers']::text[]),
  ('work_request.submitted', 'Portal request submitted', 'portal_requests', true, true, false, false,
    ARRAY['dispatch_roles', 'requestor']::text[]),
  ('work_request.approved', 'Portal request approved', 'portal_requests', true, false, false, false,
    ARRAY['requestor', 'dispatch_roles']::text[]),
  ('work_request.rejected', 'Portal request rejected', 'portal_requests', true, false, false, false,
    ARRAY['requestor']::text[]),
  ('pm.generated', 'PM task generated', 'pm', true, false, false, false,
    ARRAY['dispatch_roles', 'managers']::text[]),
  ('pm.assigned', 'PM assigned', 'pm', true, true, false, false,
    ARRAY['assigned_user', 'dispatch_roles']::text[]),
  ('pm.due_soon', 'PM due soon', 'pm', true, true, false, false,
    ARRAY['assigned_user', 'dispatch_roles', 'managers']::text[]),
  ('pm.overdue', 'PM overdue', 'pm', true, true, false, false,
    ARRAY['assigned_user', 'dispatch_roles', 'managers']::text[]),
  ('pm.completed', 'PM completed', 'pm', true, false, false, false,
    ARRAY['managers', 'dispatch_roles']::text[]),
  ('purchase_order.created', 'Purchase order created', 'purchase_orders', true, false, false, false,
    ARRAY['managers', 'admins']::text[]),
  ('purchase_order.submitted', 'Purchase order submitted', 'purchase_orders', true, true, false, false,
    ARRAY['managers', 'admins']::text[]),
  ('purchase_order.approved', 'Purchase order approved', 'purchase_orders', true, false, false, false,
    ARRAY['managers', 'dispatch_roles']::text[]),
  ('purchase_order.received', 'Purchase order received', 'purchase_orders', true, false, false, false,
    ARRAY['managers', 'inventory_roles']::text[]),
  ('inventory.low_stock', 'Low inventory alert', 'inventory', true, true, false, false,
    ARRAY['managers', 'admins', 'inventory_roles']::text[])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  default_in_app = EXCLUDED.default_in_app,
  default_email = EXCLUDED.default_email,
  default_sms = EXCLUDED.default_sms,
  default_push = EXCLUDED.default_push,
  audience_scopes = EXCLUDED.audience_scopes;
