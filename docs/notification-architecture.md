# Notification Architecture

## Overview

Notifications support **in-app** delivery and **email** (with a clear path to add more channels later). They are **company-scoped** where applicable and always **user-scoped** (recipient).

## Tables

### notifications

- **`public.notifications`**
  - `id`, `company_id` (optional), `user_id` (recipient), `event_type`, `title`, `message`, `body`, `entity_type`, `entity_id`, `metadata` (jsonb), `read_at`, `created_at`.
  - Used for in-app inbox. `event_type` drives which emails to send and future channels (digest, SMS, etc.).
  - Indexes: `user_id`, `user_id + read_at` (unread), `user_id + created_at DESC`.

### notification_preferences

- **`public.notification_preferences`**
  - `user_id`, `channel` (`in_app` | `email`), `category`, `enabled`, `created_at`, `updated_at`.
  - Unique on `(user_id, channel, category)`.
  - Categories group event types (e.g. `work_orders`, `assignments`, `overdue`, `pm`, `purchase_orders`, `inventory`, `portal_requests`).

## Event Types and Categories

Event types (examples): `work_order.created`, `work_order.assigned`, `work_order.status_changed`, `work_order.overdue`, `work_order.completed`, `pm.generated`, `pm.overdue`, `purchase_order.created`, `purchase_order.approved`, `inventory.low_stock`, `work_request.submitted`, `work_order.comment`.

Categories (for preferences): `work_orders`, `assignments`, `overdue`, `completions`, `pm`, `purchase_orders`, `inventory`, `portal_requests`.

Mapping from event type to category is in **`src/lib/notifications/types.ts`** (`eventTypeToCategory`).

## Flow

1. **Create** – Server-side code (e.g. after creating a work order) calls **`createNotification(supabase, { companyId, userId, eventType, title, message?, entityType?, entityId?, metadata? })** from **`src/lib/notifications/service.ts`**.
2. **In-app** – User sees notifications in the **NotificationCenter** (top bar). List and mark-read use **`app/(authenticated)/notifications/actions.ts`** (getNotifications, markAsRead, markAllAsRead, getNotificationsUnreadCount).
3. **Preferences** – Stored in `notification_preferences`. **`isNotificationEnabled(supabase, userId, channel, category)`** and **`setNotificationPreference(...)`** in the service. Defaults can be ensured with **`ensureDefaultPreferences(supabase, userId)`** (e.g. on first login).
4. **Email** – When sending email, check **`isNotificationEnabled(supabase, userId, 'email', category)`**. Use the project’s email abstraction (e.g. Resend); structure the code so that one “send email for this notification” path is used and can later support digests, SMS, Slack, etc.

## Delivery Strategy (Event-Friendly)

- **In-app**: Written on every `createNotification`; no queue required.
- **Email**: Call an email sender **after** `createNotification`, passing the same payload (or notification id). Later: move to a job queue, run digests, or add channels without changing the “create notification” API.
- **Future**: Same `event_type` and payload can drive SMS, push, Slack/Teams, and automation rules; add channel-specific code behind a small abstraction.

## User Preferences

- Users can turn on/off by **channel** (`in_app`, `email`) and **category** (e.g. work_orders, overdue).
- A “Notification preferences” page or section can list categories and channels and call **`setNotificationPreference`** (via a server action).
- Tenant admins can get sensible defaults (e.g. ensure default rows for new users) in the same preference table; no separate “tenant default” table is required initially.

## Migration Assumptions

- `notifications` and `notification_preferences` are created in **`20260315000000_saas_foundation.sql`**.
- No backfill of existing events; notifications start from the point the feature is deployed.
- Existing activity_logs remain the audit trail; notifications are for user-facing alerts and inbox.
