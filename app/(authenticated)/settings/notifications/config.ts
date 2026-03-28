import type { NotificationChannel } from "@/src/lib/notifications/types";

/** Settings UI columns (push reserved for future delivery). */
export const SETTINGS_CHANNELS: NotificationChannel[] = [
  "in_app",
  "email",
  "sms",
  "push",
];

export const CATEGORY_LABELS: Record<string, string> = {
  work_orders: "Work orders",
  assignments: "Assignments",
  overdue: "Overdue",
  completions: "Completions",
  pm: "Preventive maintenance",
  purchase_orders: "Purchase orders",
  inventory: "Inventory",
  portal_requests: "Portal requests",
};

