# Notification Architecture

## Overview

Notifications support **in-app**, **email**, and **SMS** (SMS wiring ready; provider pluggable). Delivery is configurable at **role level** (tenant defaults) and **user level** (overrides). Use the **central dispatch** so all modules send through one path and respect preferences.

## Tables

### notifications

- **`public.notifications`**
  - `id`, `company_id` (optional), `user_id` (recipient), `event_type`, `title`, `message`, `body`, `entity_type`, `entity_id`, `metadata` (jsonb), `read_at`, `created_at`.
  - In-app inbox only. Email/SMS use `notification_deliveries`.

### notification_event_types

- **`public.notification_event_types`** (registry)
  - `code` (PK), `name`, `category`, `default_in_app`, `default_email`, `default_sms`.
  - Seeded with event types (e.g. `work_order.assigned`, `work_request.submitted`, `pm.due_soon`). Add new rows for new event types.

### notification_rules

- **`public.notification_rules`** (role-level defaults)
  - `tenant_id`, `role`, `event_type` (FK to `notification_event_types.code`), `in_app`, `email`, `sms`, `enabled`.
  - Unique on `(tenant_id, role, event_type)`. Admins configure which channels each role gets per event type.

### notification_preferences

- **`public.notification_preferences`**
  - `user_id`, `channel` (`in_app` | `email` | `sms`), `category`, `enabled`.
  - Unique on `(user_id, channel, category)`. User overrides; when no row exists, role rule or event-type default applies.

### notification_deliveries

- **`public.notification_deliveries`** (send log for email/SMS)
  - `id`, `notification_id` (nullable), `user_id`, `channel` (`email`|`sms`), `event_type`, `entity_type`, `entity_id`, `title`, `message`, `status` (`pending`|`sent`|`failed`), `sent_at`, `error_message`, `created_at`.
  - In-app delivery is the row in `notifications`; email/SMS are logged here for status and failure handling.

## Precedence (channel on/off)

1. **User preference** – If a row exists in `notification_preferences` for (user, channel, category), use `enabled`.
2. **Role rule** – Else if a row exists in `notification_rules` for (tenant, user’s role, event_type) and `enabled`, use the rule’s `in_app` / `email` / `sms` for that channel.
3. **Event type default** – Else use `notification_event_types.default_in_app` / `default_email` / `default_sms` for the event’s `code`.

Category for user preferences comes from **`eventTypeToCategory(eventType)`** in **`src/lib/notifications/types.ts`**.

## Recipients

- **`resolveRecipients`** in **`src/lib/notifications/dispatch.ts`** builds the recipient set from:
  - `recipientUserIds` (explicit)
  - `recipientRoles` (expand to user IDs via `tenant_memberships`)
  - `includeAllTenantMembers: true` (all tenant members)
- Exclude via `excludeUserIds`. Deduplication is automatic.

## Central dispatch

- **`dispatchNotificationEvent(supabase, params)`** in **`src/lib/notifications/dispatch.ts`** is the single entry point for sending.
- Params: `tenantId`, `eventType`, `entityType`, `entityId`, `title`, `message`, optional `body`, `companyId`, `recipientUserIds`, `recipientRoles`, `includeAllTenantMembers`, `excludeUserIds`, optional `getContactForUser`.
- For each recipient and each channel (in_app, email, sms), it checks **`isChannelEnabledForUser`** (precedence above). If enabled: in_app → insert into `notifications`; email/sms → insert `notification_deliveries` (pending), send (email via Resend, SMS placeholder), then update status/sent_at/error_message.
- **Do not** call `createNotification` / `createTenantNotification` / `sendEmailAlert` directly from feature modules for event-driven notifications; use **`dispatchNotificationEvent`** so role and user preferences apply.

## Event types and categories

Event types (in `notification_event_types` and **`src/lib/notifications/types.ts`**): e.g. `work_order.created`, `work_order.assigned`, `work_order.status_changed`, `work_order.overdue`, `work_order.completed`, `work_order.vendor_assigned`, `work_request.submitted`, `pm.due_soon`, `pm.overdue`, `inventory.low_stock`, `purchase_order.created`, `purchase_order.received`.

Categories: `work_orders`, `assignments`, `overdue`, `completions`, `pm`, `purchase_orders`, `inventory`, `portal_requests`.

## Adding a new event type

1. Insert a row into **`notification_event_types`** (`code`, `name`, `category`, `default_in_app`, `default_email`, `default_sms`).
2. Add the code to **`NOTIFICATION_EVENT_TYPES`** and implement **`eventTypeToCategory`** in **`src/lib/notifications/types.ts`** if the event maps to a new category.
3. Call **`dispatchNotificationEvent`** from the feature with the new `eventType` and appropriate recipients.

No change to dispatch logic or rule evaluation is required.

## User preferences UI

- **Settings → Notifications**: per-category toggles for **In-app**, **Email**, and **SMS**. Persist via **`setNotificationPreference`** (server action).

## Email and SMS

- Email: **Resend** via **`sendEmailAlert`** in **`src/lib/notifications.ts`**. Recipient email can be provided by **`getContactForUser`** (e.g. from **`createGetContactForUser()`** in **`src/lib/notifications/get-contact.ts`** using Auth Admin).
- SMS: Architecture is in place (delivery row, status, error_message). Wire a provider in dispatch where SMS is sent and set status/sent_at accordingly.

## Migration

- **`20260315000000_saas_foundation.sql`**: `notifications`, `notification_preferences`.
- **`20260325000000_notification_suite.sql`**: `notification_event_types`, `notification_rules`, `notification_preferences` SMS channel, `notification_deliveries`.
