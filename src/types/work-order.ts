/**
 * WorkOrder entity — maintenance or service requests/jobs.
 * Links to customer, location (building/unit), asset, assigned technician, and optional vendor.
 */

import type { BaseEntity } from "./common";

/** Canonical and legacy work order statuses. Prefer canonical (new, ready_to_schedule, scheduled, in_progress, on_hold, completed, cancelled). */
export type WorkOrderStatus =
  | "draft"
  | "open"
  | "assigned"
  | "closed"
  | "new"
  | "ready_to_schedule"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

/** All valid work order priority levels. "emergency" is the highest — included for SLA routing. */
export type WorkOrderPriority = "low" | "medium" | "high" | "urgent" | "emergency";

export interface WorkOrder extends BaseEntity {
  companyId: string;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  customerId?: string | null;
  buildingId?: string | null;
  unitId?: string | null;
  assetId?: string | null;
  assignedTechnicianId?: string | null;
  vendorId?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  dueDate?: string | null;
  parentWorkOrderId?: string | null;
}
