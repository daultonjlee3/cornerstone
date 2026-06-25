import type { ChipTone } from "@/src/components/design-system/types";

export const STATUS_CHIP_MAP: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  new: { label: "New", tone: "info" },
  open: { label: "Open", tone: "info" },
  ready_to_schedule: { label: "Ready", tone: "operational" },
  assigned: { label: "Assigned", tone: "operational" },
  scheduled: { label: "Scheduled", tone: "neutral" },
  in_progress: { label: "In Progress", tone: "info" },
  on_hold: { label: "On Hold", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  closed: { label: "Closed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  overdue: { label: "Overdue", tone: "danger" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
  inactive: { label: "Inactive", tone: "neutral" },
  retired: { label: "Retired", tone: "danger" },
  pending: { label: "Pending", tone: "info" },
  submitted: { label: "Submitted", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  converted_to_work_order: { label: "Converted", tone: "operational" },
  generated: { label: "Generated", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  skipped: { label: "Skipped", tone: "neutral" },
  healthy: { label: "Healthy", tone: "success" },
  error: { label: "Error", tone: "danger" },
};

export const PRIORITY_CHIP_MAP: Record<string, { label: string; tone: ChipTone }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "warning" },
  emergency: { label: "Emergency", tone: "danger" },
};

export function fleetLegacySeverityToTone(
  severity: "critical" | "warning" | "success" | "info" | "neutral" | "accent" | string
): ChipTone {
  switch (severity) {
    case "critical":
      return "danger";
    case "accent":
      return "operational";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}
