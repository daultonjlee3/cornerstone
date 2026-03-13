-- SaaS Foundation: platform super admins, notifications, notification preferences
-- Additive only. Preserves existing tenant/company model.

-- ---------------------------------------------------------------------------
-- 1) Platform super admins (users who can access platform admin and all tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_super_admins (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_super_admins_user_id ON public.platform_super_admins (user_id);

COMMENT ON TABLE public.platform_super_admins IS 'Users with platform-wide access; can view/manage all tenants.';

-- ---------------------------------------------------------------------------
-- 2) Notifications (in-app; company-scoped; entity reference for deep links)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  message text,
  body text,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (user_id, created_at DESC);

COMMENT ON TABLE public.notifications IS 'In-app notifications; event_type drives email/digest later.';

-- ---------------------------------------------------------------------------
-- 3) Notification preferences (per user, per channel, per category)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email')),
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences (user_id);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification delivery (in_app, email). Category matches event_type groups.';
