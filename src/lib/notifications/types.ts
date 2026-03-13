/**
 * Notification event types and categories for preferences.
 * Extensible for digests, SMS, Slack, etc. later.
 */

export const NOTIFICATION_EVENT_TYPES = [
  "work_order.created",
  "work_order.assigned",
  "work_order.status_changed",
  "work_order.overdue",
  "work_order.completed",
  "pm.generated",
  "pm.overdue",
  "purchase_order.created",
  "purchase_order.approved",
  "inventory.low_stock",
  "work_request.submitted",
  "work_order.comment",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

/** Category for user preferences (groups of event types). */
export const NOTIFICATION_CATEGORIES = [
  "work_orders",
  "assignments",
  "overdue",
  "completions",
  "pm",
  "purchase_orders",
  "inventory",
  "portal_requests",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CHANNELS = ["in_app", "email"] as const;
export type NotificationChannel = (typeof CHANNELS)[number];

export function eventTypeToCategory(eventType: string): NotificationCategory {
  if (eventType.startsWith("work_order.")) {
    if (eventType === "work_order.assigned") return "assignments";
    if (eventType === "work_order.overdue") return "overdue";
    if (eventType === "work_order.completed" || eventType === "work_order.comment") return "completions";
    return "work_orders";
  }
  if (eventType.startsWith("pm.")) return "pm";
  if (eventType.startsWith("purchase_order.")) return "purchase_orders";
  if (eventType.startsWith("inventory.")) return "inventory";
  if (eventType.startsWith("work_request.")) return "portal_requests";
  return "work_orders";
}
