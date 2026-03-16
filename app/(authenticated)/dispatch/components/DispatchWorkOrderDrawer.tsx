"use client";

import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { DispatchWorkOrder } from "../types";
import { formatDate } from "@/src/lib/date-utils";

type DispatchWorkOrderDrawerProps = {
  workOrder: DispatchWorkOrder | null;
  onClose: () => void;
  onOpenFullWorkOrder: (workOrderId: string) => void;
  onReassign: (workOrderId: string) => void;
};

function formatTime(val: string | null | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatScheduleWindow(workOrder: DispatchWorkOrder): string {
  if (!workOrder.scheduled_start && !workOrder.scheduled_end) return "Unscheduled";
  const start = formatTime(workOrder.scheduled_start);
  const end = formatTime(workOrder.scheduled_end);
  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "Unscheduled";
}

function formatLocation(workOrder: DispatchWorkOrder): string {
  const pieces = [
    workOrder.property_name,
    workOrder.building_name,
    workOrder.unit_name,
    workOrder.location,
  ].filter(Boolean);
  return pieces.join(" / ") || "—";
}

export function DispatchWorkOrderDrawer({
  workOrder,
  onClose,
  onOpenFullWorkOrder,
  onReassign,
}: DispatchWorkOrderDrawerProps) {
  if (!workOrder) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      role="dialog"
      aria-modal
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--card-border)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Work order</p>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {workOrder.work_order_number ?? `WO-${workOrder.id.slice(0, 8)}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="Close details"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">{workOrder.title ?? "Untitled work order"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <PriorityBadge priority={workOrder.priority ?? "medium"} />
              <StatusBadge status={workOrder.status ?? "new"} />
            </div>
          </div>

          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Property</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {workOrder.property_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Asset</dt>
              <dd className="font-medium text-[var(--foreground)]">{workOrder.asset_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Assigned technician</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {workOrder.assigned_technician_name ??
                  (workOrder.assigned_crew_name ? `${workOrder.assigned_crew_name} (crew)` : "Unassigned")}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Scheduled date</dt>
              <dd className="font-medium text-[var(--foreground)]">{formatDate(workOrder.scheduled_date ?? null)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Scheduled window</dt>
              <dd className="font-medium text-[var(--foreground)]">{formatScheduleWindow(workOrder)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Location</dt>
              <dd className="font-medium text-[var(--foreground)]">{formatLocation(workOrder)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-2 border-t border-[var(--card-border)] px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenFullWorkOrder(workOrder.id)}
            className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Open work order
          </button>
          <button
            type="button"
            onClick={() => onReassign(workOrder.id)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Reassign
          </button>
        </div>
      </aside>
    </div>
  );
}
