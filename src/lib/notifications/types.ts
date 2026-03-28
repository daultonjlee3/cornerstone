/**
 * Notification event types and categories for preferences.
 * Extensible for digests, SMS, Slack, push, etc.
 */

export const NOTIFICATION_EVENT_TYPES = [
  "work_order.created",
  "work_order.assigned",
  "work_order.reassigned",
  "work_order.schedule_changed",
  "work_order.status_changed",
  "work_order.due_soon",
  "work_order.overdue",
  "work_order.completed",
  "work_order.comment",
  "work_order.emergency_created",
  "work_order.vendor_assigned",
  "work_request.submitted",
  "work_request.approved",
  "work_request.rejected",
  "pm.generated",
  "pm.assigned",
  "pm.due_soon",
  "pm.overdue",
  "pm.completed",
  "purchase_order.created",
  "purchase_order.submitted",
  "purchase_order.approved",
  "purchase_order.received",
  "inventory.low_stock",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

/** Category for grouping in UI and legacy preferences. */
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

export const CHANNELS = ["in_app", "email", "sms", "push"] as const;
export type NotificationChannel = (typeof CHANNELS)[number];

export function eventTypeToCategory(eventType: string): NotificationCategory {
  if (eventType.startsWith("work_order.")) {
    if (
      eventType === "work_order.assigned" ||
      eventType === "work_order.reassigned" ||
      eventType === "work_order.vendor_assigned"
    ) {
      return "assignments";
    }
    if (eventType === "work_order.overdue" || eventType === "work_order.due_soon") return "overdue";
    if (eventType === "work_order.completed" || eventType === "work_order.comment") return "completions";
    return "work_orders";
  }
  if (eventType.startsWith("pm.")) return "pm";
  if (eventType.startsWith("purchase_order.")) return "purchase_orders";
  if (eventType.startsWith("inventory.")) return "inventory";
  if (eventType.startsWith("work_request.")) return "portal_requests";
  return "work_orders";
}
