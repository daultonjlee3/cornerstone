-- Sprint 2 — integration.sync_failed notification event type

INSERT INTO public.notification_event_types (
  code, name, category, default_in_app, default_email, default_sms, default_push, audience_scopes
)
VALUES (
  'integration.sync_failed',
  'Integration sync failed',
  'integrations',
  true,
  true,
  false,
  false,
  ARRAY['admins', 'managers']::text[]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  default_in_app = EXCLUDED.default_in_app,
  default_email = EXCLUDED.default_email,
  audience_scopes = EXCLUDED.audience_scopes;
