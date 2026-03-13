# Impersonation System

This document describes the secure impersonation feature: who can impersonate whom, how the session model works, the UI (banner and return flow), and audit logging.

## Session Model

Impersonation keeps two identities in play:

- **Original user** — The person who is logged in (from `auth.getUser()`). This never changes during impersonation.
- **Acting user** — The user being impersonated. Stored in an httpOnly cookie and used for tenant, company, and permission resolution.

So:

- **original_user_id** = authenticated user id (real session).
- **acting_as_user_id** = value in the impersonation cookie when set; otherwise the app behaves as the original user.

Permissions, tenant context, and company context are always derived from the **effective** user id: when the cookie is set, that is the acting user; when it is not set, it is the authenticated user. The application never grants the impersonated user’s identity to the auth session itself; only the cookie drives “who we’re acting as.”

## Who Can Impersonate

### Platform super admin

- Can start impersonation from **Platform Admin** → Tenants → Tenant detail → “Impersonate” next to a user.
- Can impersonate **any user in any tenant** except:
  - Other **platform_super_admin** users (blocked by design; can be relaxed later with an explicit allow list if needed).
- Eligibility is enforced **server-side** in `startImpersonationPlatform(actingAsUserId)`.

### Tenant admin (owner or admin)

- Can start impersonation from **Settings → Users** → “Impersonate” next to a user.
- Can impersonate **only users in their own tenant**.
- **Cannot** impersonate:
  - Users in other tenants.
  - **Platform super admin** users.
- Eligibility is enforced **server-side** in `startImpersonationTenant(actingAsUserId)`.

## Starting Impersonation

1. Admin clicks “Impersonate” (platform or settings).
2. Client calls the appropriate server action (`startImpersonationPlatform` or `startImpersonationTenant`) with the target user id.
3. Server checks eligibility (platform vs tenant rules, no impersonation of platform super admins).
4. On success:
   - Server sets an **httpOnly** impersonation cookie (e.g. `cornerstone_impersonation`) with `actingAsUserId` and `startedAt`.
   - Server logs an **impersonation_start** activity event (see Audit logging).
   - Client redirects to `/dashboard`.
5. On failure, the action returns an error message and the UI displays it.

## Impersonation Banner

When the impersonation cookie is set, the app shows a **persistent banner** across the authenticated shell:

- Text: e.g. **“Impersonating: John Smith (Acme Facilities)”** (acting user’s name and company).
- Button: **“Return to My Profile”**.

The banner is rendered by the layout (which reads the cookie and resolves acting user name/company) and remains visible across all navigation until impersonation ends.

## One-Click Return to Original User

- **“Return to My Profile”** appears in:
  1. The impersonation banner.
  2. The user/account dropdown in the top bar (when impersonating).

Behavior when the user clicks it:

1. Client calls the **endImpersonation(returnPath?)** server action (e.g. with `"/dashboard"`).
2. Server logs **impersonation_end** (see Audit logging).
3. Server **clears** the impersonation cookie.
4. Server redirects to the given path (or `/dashboard`). The user is **not** logged out and does **not** re-authenticate; they simply resume as the original user.

This works the same for both platform admins and tenant admins.

## Audit Logging

Every impersonation start and end is recorded in the existing **activity_logs** table.

### impersonation_start

- **entity_type:** `"impersonation"`
- **entity_id:** impersonated user id
- **action_type:** `"impersonation_start"`
- **performed_by:** original (impersonator) user id
- **tenant_id / company_id:** when available (e.g. from the impersonated user’s tenant/company)
- **metadata:**  
  `impersonator_user_id`, `impersonated_user_id`, `started_at` (ISO string), and optionally `scope` (`"platform"` or `"tenant"`)

### impersonation_end

- **entity_type:** `"impersonation"`
- **entity_id:** impersonated user id (from cookie before clear)
- **action_type:** `"impersonation_end"`
- **performed_by:** original (impersonator) user id
- **metadata:**  
  `impersonator_user_id`, `impersonated_user_id`, `ended_at` (ISO string)

These logs support compliance and security reviews (who impersonated whom, when, and from which scope).

## Security Guardrails

- **Cookie** — HttpOnly, path `/`, 8-hour max age (configurable). Not readable by client JS; only the server sets/clears it.
- **Eligibility** — All checks are server-side. Platform super admins cannot impersonate other super admins; tenant admins cannot impersonate outside their tenant or platform super admins.
- **Tenant boundaries** — Tenant admin impersonation is limited to the same `tenant_id`; platform impersonation can cross tenants but does not weaken RLS or tenant checks for the acting user (they still see only their own tenant’s data).
- **Visibility** — The banner and dropdown “Return to My Profile” make it obvious when the session is impersonated, reducing misuse.

## Implementation References

- **Cookie and effective user:** `src/lib/impersonation.ts` (cookie name, get/set/clear, `getEffectiveUserId`).
- **Auth context:** `src/lib/auth-context.ts` (effective user, tenant/company/role from effective user, `isPlatformSuperAdmin` vs `isUserPlatformSuperAdmin`).
- **Actions:** `app/platform/impersonate/actions.ts` (`startImpersonationPlatform`, `startImpersonationTenant`, `endImpersonation`).
- **Banner:** `app/(authenticated)/components/impersonation-banner.tsx`.
- **Layout/Shell:** Authenticated layout resolves impersonation state and passes banner props to the shell; top bar shows “Return to My Profile” in the account dropdown when impersonating.
- **Activity logs:** `src/lib/activity-logs.ts` (`insertActivityLog` with `action_type` `impersonation_start` / `impersonation_end`).

## Related Documentation

- [Admin architecture](./admin-architecture.md) — Platform and tenant admin areas, roles, and navigation.
