# Notification Architecture

## Overview

Notifications support **in-app**, **email**, **SMS**, and a reserved **push** flag (UI + policy ready; delivery skipped in dispatch until a provider exists). Configuration is **layered**:

1. **System defaults** — `notification_event_types` per `code` (plus optional `audience_scopes`, `default_push`).
2. **Company overrides** — `notification_company_rules` per `(company_id, event_type)`; nullable columns mean *inherit*.
3. **Role defaults** — `notification_rules` per tenant, `role`, and `event_type`, optionally scoped with `company_id` (null = tenant-wide). Nullable columns inherit from the company + system stack.
4. **User overrides** — `notification_user_event_preferences` per `(user_id, event_type)`; per-channel null = inherit from role/company/system.

**Legacy** `notification_preferences` (category × channel) is **not** read by dispatch or the new settings UI. It may remain in the database for older data but has no effect on delivery.

Use **`dispatchNotificationEvent`** for event-driven sends so **policy resolution** and delivery logging stay centralized.

## Tables

### notifications

- **`public.notifications`**
  - `id`, `company_id` (optional), `user_id` (recipient), `event_type`, `title`, `message`, `body`, `entity_type`, `entity_id`, `metadata` (jsonb), `read_at`, `created_at`.
  - In-app inbox only. Email/SMS use `notification_deliveries`.

### notification_event_types

- **`public.notification_event_types`** (registry)
  - `code` (PK), `name`, `category`, `default_in_app`, `default_email`, `default_sms`, `default_push`, `audience_scopes` (text[]).
  - `audience_scopes` documents who the event is meant for (e.g. `assigned_user`, `dispatch_roles`); dispatch code should expand recipients accordingly.

### notification_company_rules

- **`public.notification_company_rules`**
  - `tenant_id`, `company_id`, `event_type`, optional `enabled`, `in_app`, `email`, `sms`, `push`, optional `audience_scopes`.
  - Unique `(company_id, event_type)`. NULL on a field = inherit from `notification_event_types`.

### notification_rules

- **`public.notification_rules`** (role-level defaults)
  - `tenant_id`, `role`, `event_type`, optional `company_id` (null = tenant-wide role default), nullable `enabled`, `in_app`, `email`, `sms`, `push`.
  - Partial uniques: `(tenant_id, role, event_type)` where `company_id` IS NULL; `(tenant_id, role, event_type, company_id)` where `company_id` IS NOT NULL.

### notification_user_event_preferences

- **`public.notification_user_event_preferences`**
  - `user_id`, `event_type`, nullable `in_app`, `email`, `sms`, `push`.
  - Unique `(user_id, event_type)`. Per-channel NULL = inherit from layers below.

### notification_preferences (legacy)

- **`public.notification_preferences`**
  - Category-wide overrides; **unused** by current dispatch. Prefer per-event user rows above.

### notification_deliveries

- **`public.notification_deliveries`** (send log for email/SMS)
  - `id`, `user_id`, `channel` (`email`|`sms`), `event_type`, `entity_type`, `entity_id`, `title`, `message`, `status`, `sent_at`, `error_message`, `created_at`.

## Precedence (per channel)

Implemented in **`src/lib/notifications/policy.ts`** (`computeNotificationLayersFromState`, `resolveNotificationChannelLayers`, `isChannelEnabledForUserResolved`):

1. Start from **event type defaults**.
2. Apply **company rule** non-null fields; if `company.enabled === false`, all channels off for that company.
3. Apply **role rule** (company-scoped row if present, else tenant-wide); if `role.enabled === false`, all channels off for that role in that resolution context.
4. Apply **user per-event** non-null channel fields.

**Net effect:** user choice wins over role, role over company, company over system defaults—unless a master `enabled` flag at company or role layer forces all channels off.

## Recipients and targeting

- **`resolveRecipients`** in **`src/lib/notifications/dispatch.ts`**: `recipientUserIds`, `recipientRoles` (via `tenant_memberships`), optional `includeAllTenantMembers`, `excludeUserIds`.
- **`expandWorkOrderAssignmentRecipientUserIds`**: assigned technician’s linked user, crew members’ linked users, plus roles `owner`, `admin`, `member` (dispatch desk). Use this instead of `includeAllTenantMembers` for assignment/schedule events so technicians are not spammed with everyone else’s work.
- Audience scope labels for the UI: **`src/lib/notifications/audiences.ts`**.

## Central dispatch

- **`dispatchNotificationEvent(supabase, params)`** in **`src/lib/notifications/dispatch.ts`**.
- Params include `tenantId`, `companyId`, `eventType`, entity fields, title/message, recipients, `getContactForUser`, etc.
- For each recipient, resolves channels with **`isChannelEnabledForUserResolved`** (cached membership role per batch). **Push** is resolved but not sent yet.
- **`isChannelEnabledForUser`** remains as a thin wrapper that loads the user’s role and calls the resolver.

**Do not** call `createNotification` / `sendEmailAlert` directly for policy-governed events; use **`dispatchNotificationEvent`**.

## Settings UI

- **Settings → Notifications** (`app/(authenticated)/settings/notifications/`): tabs **Company defaults**, **Role defaults**, **My preferences** (non-admins see only My preferences).
- Server actions: **`app/(authenticated)/settings/notifications/actions.ts`** (`upsertCompanyNotificationRule`, `upsertRoleNotificationRule`, `setUserEventNotificationChannel`).
- Row building / maps: **`src/lib/notifications/settings-view.ts`**.

## Code map

| Area | Location |
|------|----------|
| Policy / precedence | `src/lib/notifications/policy.ts` |
| Dispatch + recipients | `src/lib/notifications/dispatch.ts` |
| Event type constants | `src/lib/notifications/types.ts` |
| Audience labels | `src/lib/notifications/audiences.ts` |
| In-app CRUD | `src/lib/notifications/service.ts` |

## Migrations (reference)

- `20260315000000_saas_foundation.sql`: `notifications`, `notification_preferences`.
- `20260325000000_notification_suite.sql`: event types, role rules, deliveries.
- `20260330100000_notification_policy_layers.sql`: company rules, user event prefs, nullable role rules, `company_id` on rules, `audience_scopes`, `default_push`.
- `20260330110000_notification_rules_push_column.sql`: `push` on `notification_rules`.

## Adding a new event type

1. Insert into **`notification_event_types`** (including `audience_scopes` and `default_push` as needed).
2. Add the code to **`NOTIFICATION_EVENT_TYPES`** in **`src/lib/notifications/types.ts`** and extend **`eventTypeToCategory`** if needed for legacy grouping.
3. Call **`dispatchNotificationEvent`** with explicit recipients (and `companyId` when applicable) so only the intended audience is notified.

## Example role defaults (reference)

Configure under **Settings → Notifications → Role defaults**. These are **starting points**, not auto-seeded:

| Event group | Technician | Member (dispatcher) | Owner / Admin |
|-------------|------------|---------------------|----------------|
| Work order assigned / schedule / status / comments / due / overdue | In-app (+ email/SMS for assigned path only if desired) | In-app + email for dispatch-facing events | In-app + email; email for escalations (overdue, emergency) |
| Work order created / emergency | Off or in-app only | In-app + email | In-app + email + SMS for emergency |
| Portal requests | Off | In-app + email | In-app + email |
| PM assigned / due / overdue | In-app for assigned PMs | In-app + email | + email for overdue |
| PO / inventory | Off | Email for submitted POs | Full management alerts |

Technicians should use **tenant-wide** role rows with narrow **Event on** and channels so only **assigned-user**-style events matter in practice; dispatch still must target recipients (see `expandWorkOrderAssignmentRecipientUserIds`).

## Follow-ups

- Narrow **`includeAllTenantMembers`** usage in remaining call sites (e.g. portal requests) to explicit audiences.
- Enforce **RLS** (or service role) consistently for `notification_company_rules`, `notification_rules`, and `notification_user_event_preferences` if not already aligned with tenant isolation.
- Wire **push** delivery when a mobile client exists; dispatch already skips sending but resolves the flag.
