"use client";

import { useState } from "react";
import type { DispatchWorkOrder } from "../types";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";

export type DispatchWorkOrderCardProps = {
  workOrder: DispatchWorkOrder;
  variant?: "block" | "compact";
  showScheduledTime?: boolean;
  showCrew?: boolean;
  isDragging?: boolean;
  /** When true, show hover quick actions (View, Reassign, Mark complete, Open). */
  showQuickActions?: boolean;
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "";
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  if (start) return `From ${formatTime(start)}`;
  return `Until ${formatTime(end)}`;
}

function getLocationLine(wo: DispatchWorkOrder): string | null {
  const parts: string[] = [];
  if (wo.property_name) parts.push(wo.property_name);
  if (wo.building_name) parts.push(wo.building_name);
  if (wo.unit_name) parts.push(wo.unit_name);
  if (wo.location) parts.push(wo.location as string);
  return parts.length ? parts.join(" / ") : null;
}

function getAssignmentLine(wo: DispatchWorkOrder): { label: string; tone: string } {
  if (wo.assigned_technician_name) {
    return { label: `Assigned to ${wo.assigned_technician_name}`, tone: "text-blue-700" };
  }
  if (wo.assigned_crew_name) {
    return { label: `Assigned to ${wo.assigned_crew_name}`, tone: "text-teal-700" };
  }
  return { label: "Unassigned", tone: "text-amber-700" };
}

/** Job type for display and color: emergency, preventive_maintenance, inspection, installation, repair, general. */
function getJobType(wo: DispatchWorkOrder): string {
  if (wo.source_type === "preventive_maintenance" || wo.category === "preventive_maintenance")
    return "preventive_maintenance";
  const c = (wo.category ?? "").toLowerCase();
  if (c === "emergency") return "emergency";
  if (c === "inspection") return "inspection";
  if (c === "installation" || c === "install") return "installation";
  if (c === "repair") return "repair";
  return "standard";
}

function getJobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "emergency":
      return "Emergency";
    case "preventive_maintenance":
      return "PM";
    case "inspection":
      return "Inspection";
    case "installation":
      return "Install";
    case "repair":
      return "Repair";
    default:
      return "Service";
  }
}

function getTypeBorderClass(jobType: string): string {
  switch (jobType) {
    case "emergency":
      return "border-l-4 border-l-red-500";
    case "preventive_maintenance":
      return "border-l-4 border-l-blue-500";
    case "inspection":
      return "border-l-4 border-l-purple-500";
    case "installation":
      return "border-l-4 border-l-green-500";
    default:
      return "border-l-4 border-l-[var(--card-border)]";
  }
}

function getTypeBgClass(jobType: string): string {
  switch (jobType) {
    case "emergency":
      return "bg-red-500/10";
    case "preventive_maintenance":
      return "bg-blue-500/10";
    case "inspection":
      return "bg-purple-500/10";
    case "installation":
      return "bg-green-500/10";
    default:
      return "bg-[var(--card)]";
  }
}

export function DispatchWorkOrderCard({
  workOrder,
  variant = "block",
  showScheduledTime = false,
  showCrew = true,
  isDragging = false,
  showQuickActions = true,
  onOpenWorkOrder,
}: DispatchWorkOrderCardProps) {
  const [hover, setHover] = useState(false);
  const title = workOrder.title ?? "Untitled";
  const priority = workOrder.priority ?? "medium";
  const timeRange =
    showScheduledTime && (workOrder.scheduled_start || workOrder.scheduled_end)
      ? formatTimeRange(workOrder.scheduled_start, workOrder.scheduled_end)
      : null;
  const location = getLocationLine(workOrder);
  const assignment = getAssignmentLine(workOrder);
  const jobType = getJobType(workOrder);
  const typeBorder = getTypeBorderClass(jobType);
  const typeBg = getTypeBgClass(jobType);
  const showActions = showQuickActions && hover && !isDragging && onOpenWorkOrder;

  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl border border-[var(--card-border)] ${typeBorder} ${typeBg} px-3 py-2 text-sm shadow-[var(--shadow-soft)] ${
          isDragging ? "opacity-75 shadow-lg" : ""
        }`}
      >
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {workOrder.work_order_number ?? "Work order"}
        </p>
        <p className="truncate font-medium text-[var(--foreground)]">{title}</p>
        {workOrder.asset_name ? (
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{workOrder.asset_name}</p>
        ) : null}
        {timeRange && <p className="mt-0.5 text-xs text-[var(--muted)]">{timeRange}</p>}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border border-[var(--card-border)] ${typeBorder} ${typeBg} p-3 shadow-[var(--shadow-soft)] ${
        isDragging ? "opacity-90 shadow-lg" : ""
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {workOrder.work_order_number ?? "Work order"}
      </p>
      <p className="truncate text-sm font-medium text-[var(--foreground)]">{title}</p>
      {workOrder.asset_name ? (
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{workOrder.asset_name}</p>
      ) : null}

      {location && (
        <p className="mt-1 truncate text-xs text-[var(--muted)]" title={location}>
          {location}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priority} />
        <span className="rounded bg-[var(--muted)]/20 px-1.5 py-0.5 text-xs text-[var(--muted)]">
          {getJobTypeLabel(jobType)}
        </span>
        {workOrder.status ? <StatusBadge status={workOrder.status} /> : null}
      </div>

      {timeRange && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">{timeRange}</p>
      )}

      {showCrew ? <p className={`mt-1 text-xs font-medium ${assignment.tone}`}>{assignment.label}</p> : null}

      {showActions && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 rounded-b-lg border-t border-[var(--card-border)] bg-[var(--card)]/95 px-2 py-1.5">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenWorkOrder?.(workOrder.id, "view");
            }}
          >
            View
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenWorkOrder?.(workOrder.id, "reassign");
            }}
          >
            Reassign
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenWorkOrder?.(workOrder.id, "complete");
            }}
          >
            Mark complete
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenWorkOrder?.(workOrder.id, "open");
            }}
          >
            Open WO
          </button>
        </div>
      )}
    </div>
  );
}
