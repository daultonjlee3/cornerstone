import type { NotificationChannel } from "@/src/lib/notifications/types";

export const CHANNELS: NotificationChannel[] = ["in_app", "email", "sms"];

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

