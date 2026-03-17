-- Configurable notification suite: event types, role rules, user overrides, delivery log.
-- Extends existing notifications and notification_preferences.

-- ---------------------------------------------------------------------------
-- 1) Notification event types (registry for rules and templates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_event_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  default_in_app boolean NOT NULL DEFAULT true,
  default_email boolean NOT NULL DEFAULT false,
  default_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_event_types IS 'Registry of notification event types; drives role rules and defaults.';

INSERT INTO public.notification_event_types (code, name, category, default_in_app, default_email, default_sms)
VALUES
  ('work_order.created', 'Work order created', 'work_orders', true, false, false),
  ('work_order.assigned', 'Work order assigned', 'assignments', true, true, true),
  ('work_order.status_changed', 'Work order status changed', 'work_orders', true, false, false),
  ('work_order.overdue', 'Work order overdue', 'overdue', true, true, false),
  ('work_order.completed', 'Work order completed', 'completions', true, false, false),
  ('work_request.submitted', 'Request submitted', 'portal_requests', true, true, false),
  ('pm.due_soon', 'PM due soon', 'pm', true, true, false),
  ('pm.overdue', 'PM overdue', 'pm', true, true, false),
  ('inventory.low_stock', 'Low stock alert', 'inventory', true, true, false),
  ('purchase_order.created', 'PO created', 'purchase_orders', true, false, false),
  ('purchase_order.received', 'PO received', 'purchase_orders', true, false, false),
  ('work_order.vendor_assigned', 'Vendor assigned to work order', 'assignments', true, true, false)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Role-level notification rules (defaults by role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  role text NOT NULL,
  event_type text NOT NULL REFERENCES public.notification_event_types (code) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  sms boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant_role ON public.notification_rules (tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON public.notification_rules (event_type);

DROP TRIGGER IF EXISTS set_notification_rules_updated_at ON public.notification_rules;
CREATE TRIGGER set_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_rules IS 'Role-level notification defaults: which channels per event type.';

-- ---------------------------------------------------------------------------
-- 3) Extend notification_preferences: add SMS channel
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_channel_check;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_channel_check
  CHECK (channel IN ('in_app', 'email', 'sms'));

-- ---------------------------------------------------------------------------
-- 4) Notification deliveries (send log for email/SMS; in-app uses notifications table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications (id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  title text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON public.notification_deliveries (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON public.notification_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON public.notification_deliveries (created_at DESC);

COMMENT ON TABLE public.notification_deliveries IS 'Delivery log for email and SMS; in-app delivery is the notifications row.';
