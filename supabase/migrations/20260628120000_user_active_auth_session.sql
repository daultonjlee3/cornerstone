-- Track the single allowed auth session per user (logout other devices on new login).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_auth_session_id uuid;

COMMENT ON COLUMN public.users.active_auth_session_id IS
  'GoTrue session_id for the user''s current login. Other sessions are invalidated on new sign-in.';

CREATE INDEX IF NOT EXISTS idx_users_active_auth_session_id
  ON public.users (active_auth_session_id)
  WHERE active_auth_session_id IS NOT NULL;
