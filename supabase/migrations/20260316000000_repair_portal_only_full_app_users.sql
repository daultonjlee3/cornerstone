-- Repair: ensure users who have a full-app role (owner, admin, member, viewer)
-- in tenant_memberships are never treated as portal-only.
-- This fixes lockout when an admin's email was used as a technician login and
-- public.users.is_portal_only was set to true (and optionally role overwritten to technician).
-- Users whose only membership role is 'technician' are unchanged; they remain portal-only.
-- See docs/technician-portal-access.md.

UPDATE public.users u
SET is_portal_only = false
WHERE u.is_portal_only = true
  AND EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    WHERE tm.user_id = u.id
      AND tm.role IN ('owner', 'admin', 'member', 'viewer')
  );
