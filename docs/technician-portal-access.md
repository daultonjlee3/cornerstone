# Technician portal vs main app access

## How the app determines access

- **Full app user:** `public.users.is_portal_only = false`. They can reach the main app. Their `tenant_memberships.role` is typically `owner`, `admin`, `member`, or `viewer`.
- **Portal-only user:** `public.users.is_portal_only = true`. Login and middleware send them to `/portal`; they cannot reach main app routes unless they have an owner/admin membership (see below).
- **Both (full app + technician):** Same user has `is_portal_only = false` and at least one `tenant_memberships` row with role `owner`/`admin`/`member`/`viewer`, and is also linked via `technicians.user_id`. They use the main app normally and can also use the technician portal (or be impersonated).

## Root cause of lockout

**Table/field that caused the lockout:** `public.users.is_portal_only`

When an admin created a “technician login” using an email that already belonged to a full app user:

1. **`resolveOrCreatePortalUser`** (technicians flow) found the existing user by email and then:
   - Set `public.users.is_portal_only = true` for that user (downgrading them to portal-only).
   - Upserted `tenant_memberships` with `role = 'technician'`, **overwriting** their existing `owner`/`admin` role (single row per user per tenant).
2. **Login** and **middleware** then treated the user as portal-only and sent them to `/portal`.
3. **Authenticated layout** only allowed main app if the user had role `owner` or `admin`; that role had been replaced by `technician`, so they were redirected back to `/portal`.

So the same email could no longer get into the main app. The fix is to never set `is_portal_only = true` and never overwrite a full-app role when linking an **existing** full app user as a technician.

## Guardrails after fix

- When linking a technician to an email that already has a full-app role in that tenant, we do **not** set `is_portal_only = true` and do **not** change their `tenant_memberships.role`. We only add/update `company_memberships` and `technicians.user_id`.
- The technician creation UI shows a warning when the entered email is already a full app user so the admin knows that person will keep main app access.
- Authenticated layout treats a user as allowed in the main app if **any** of their `tenant_memberships` has role `owner` or `admin` (not only the first row).

## Data repair

- **Migration `20260316000000_repair_portal_only_full_app_users.sql`:** Sets `is_portal_only = false` for any user who has at least one `tenant_memberships` row with role in `('owner','admin','member','viewer')`. Run this to fix users who were wrongly marked portal-only but still have a full-app role.
- **If the user’s role was overwritten to `technician` only:** The migration does not restore role. Use the portal “Restore my main app access” button (if the email is in `PORTAL_RESTORE_ACCESS_EMAILS`) or run SQL to set `users.is_portal_only = false` and `tenant_memberships.role = 'owner'` (or the desired role) for that user.
