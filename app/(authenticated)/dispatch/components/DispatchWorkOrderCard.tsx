"use client";

import type { DispatchWorkOrder } from "../types";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { DispatchCard } from "./DispatchCard";

export type DispatchWorkOrderCardProps = {
  workOrder: DispatchWorkOrder;
  variant?: "block" | "compact";
  showScheduledTime?: boolean;
  showCrew?: boolean;
  isDragging?: boolean;
  /** When true, show hover quick actions (View, Reassign, Mark complete, Open). */
  showQuickActions?: boolean;
  travelEstimate?: string | null;
  onOpenWorkOrder?: (
    id: string,
    action?: "view" | "reassign" | "complete" | "open" | "unschedule"
  ) => void;
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

function getTypeBadgeClass(jobType: string): string {
  switch (jobType) {
    case "emergency":
      return "border border-red-200 bg-red-100 text-red-700";
    case "preventive_maintenance":
      return "border border-blue-200 bg-blue-100 text-blue-700";
    case "inspection":
      return "border border-purple-200 bg-purple-100 text-purple-700";
    case "installation":
      return "border border-green-200 bg-green-100 text-green-700";
    case "repair":
      return "border border-amber-200 bg-amber-100 text-amber-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

function isOverdue(wo: DispatchWorkOrder): boolean {
  if (!wo.due_date) return false;
  const status = String(wo.status ?? "").toLowerCase();
  if (status === "completed" || status === "cancelled" || status === "closed") return false;
  return wo.due_date < new Date().toISOString().slice(0, 10);
}

export function DispatchWorkOrderCard({
  workOrder,
  variant = "block",
  showScheduledTime = false,
  showCrew = true,
  isDragging = false,
  showQuickActions = true,
  travelEstimate = null,
  onOpenWorkOrder,
}: DispatchWorkOrderCardProps) {
  const title = workOrder.title ?? "Untitled";
  const priority = workOrder.priority ?? "medium";
  const timeRange =
    showScheduledTime && (workOrder.scheduled_start || workOrder.scheduled_end)
      ? formatTimeRange(workOrder.scheduled_start, workOrder.scheduled_end)
      : null;
  const location = getLocationLine(workOrder);
  const assignment = getAssignmentLine(workOrder);
  const jobType = getJobType(workOrder);
  const typeBadgeClass = getTypeBadgeClass(jobType);
  const overdue = isOverdue(workOrder);
  const showActions = showQuickActions && !isDragging && onOpenWorkOrder;
  const preventDragFromAction = (event: React.SyntheticEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  if (variant === "compact") {
    return (
      <DispatchCard priority={priority} isOverdue={overdue} isDragging={isDragging} className="text-sm">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {workOrder.work_order_number ?? "Work order"}
        </p>
        <p className="truncate text-[15px] font-semibold leading-tight text-[var(--foreground)]">{title}</p>
        {workOrder.asset_name || location ? (
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            {[workOrder.asset_name, location].filter(Boolean).join(" • ")}
          </p>
        ) : null}
        {timeRange ? <p className="mt-1 text-xs text-[var(--muted)]">{timeRange}</p> : null}
      </DispatchCard>
    );
  }

  return (
    <DispatchCard
      priority={priority}
      isOverdue={overdue}
      isDragging={isDragging}
      className="h-full cursor-grab active:cursor-grabbing"
    >
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {workOrder.work_order_number ?? "Work order"}
      </p>
      <p className="truncate text-base font-semibold leading-tight text-[var(--foreground)]">{title}</p>

      {(workOrder.asset_name || location) && (
        <p className="mt-1 truncate text-sm text-[var(--muted-strong)]" title={location ?? undefined}>
          {[workOrder.asset_name, location].filter(Boolean).join(" • ")}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priority} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass}`}>
          {getJobTypeLabel(jobType)}
        </span>
        {workOrder.status ? <StatusBadge status={workOrder.status} /> : null}
        {overdue ? (
          <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Overdue
          </span>
        ) : null}
        {travelEstimate ? (
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            {travelEstimate}
          </span>
        ) : null}
      </div>

      {timeRange && (
        <p className="mt-2 text-xs text-[var(--muted)]">{timeRange}</p>
      )}

      {showCrew ? <p className={`mt-1.5 text-xs font-semibold ${assignment.tone}`}>{assignment.label}</p> : null}
      {showActions
        ? variant === "block"
          ? (
            <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
              <button
                type="button"
                data-dispatch-quick-action="1"
                className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200/80"
                onPointerDown={preventDragFromAction}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWorkOrder?.(workOrder.id, "unschedule");
                }}
              >
                Unschedule
              </button>
              <button
                type="button"
                data-dispatch-quick-action="1"
                className="rounded border border-[var(--card-border)] bg-[var(--card)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/35"
                onPointerDown={preventDragFromAction}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWorkOrder?.(workOrder.id, "open");
                }}
              >
                Open
              </button>
            </div>
          )
          : (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-[var(--card-border)] pt-1.5">
              <button
                type="button"
                data-dispatch-quick-action="1"
                className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
                onPointerDown={preventDragFromAction}
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
                data-dispatch-quick-action="1"
                className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
                onPointerDown={preventDragFromAction}
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
                data-dispatch-quick-action="1"
                className="rounded px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
                onPointerDown={preventDragFromAction}
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
                data-dispatch-quick-action="1"
                className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100/60"
                onPointerDown={preventDragFromAction}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWorkOrder?.(workOrder.id, "unschedule");
                }}
              >
                Unschedule
              </button>
              <button
                type="button"
                data-dispatch-quick-action="1"
                className="rounded px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                onPointerDown={preventDragFromAction}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWorkOrder?.(workOrder.id, "open");
                }}
              >
                Open WO
              </button>
            </div>
          )
        : null}
    </DispatchCard>
  );
}
