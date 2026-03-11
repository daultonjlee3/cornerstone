"use client";

import Link from "next/link";
import { useCallback } from "react";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import { WorkOrderPriorityBadge } from "./work-order-priority-badge";

export type WorkOrderListRow = {
  id: string;
  work_order_number?: string | null;
  title: string;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  scheduled_date?: string | null;
  technician_name?: string | null;
  crew_name?: string | null;
  location?: string | null;
  asset_name?: string | null;
  company_name?: string | null;
  source_type?: string | null;
  preventive_maintenance_plan_id?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type WorkOrderDetailDrawerProps = {
  workOrder: WorkOrderListRow | null;
  onClose: () => void;
  onAssign: () => void;
  onEdit: () => void;
};

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

function assignedDisplay(wo: WorkOrderListRow): string {
  const tech = wo.technician_name;
  const crew = wo.crew_name;
  if (tech && crew) return `${tech} / ${crew}`;
  if (tech) return tech;
  if (crew) return crew;
  return "Unassigned";
}

export function WorkOrderDetailDrawer({
  workOrder,
  onClose,
  onAssign,
  onEdit,
}: WorkOrderDetailDrawerProps) {
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!workOrder) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      aria-modal
      role="dialog"
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-md overflow-y-auto border-l border-[var(--card-border)] bg-[var(--card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {workOrder.work_order_number ?? workOrder.id.slice(0, 8)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">{workOrder.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <WorkOrderStatusBadge status={workOrder.status ?? "new"} />
              <WorkOrderPriorityBadge priority={workOrder.priority ?? "medium"} />
            </div>
          </div>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Due date</dt>
              <dd className="font-medium text-[var(--foreground)]">{formatDate(workOrder.due_date)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Scheduled</dt>
              <dd className="font-medium text-[var(--foreground)]">{formatDate(workOrder.scheduled_date)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Assigned to</dt>
              <dd className="font-medium text-[var(--foreground)]">{assignedDisplay(workOrder)}</dd>
            </div>
            {workOrder.location ? (
              <div>
                <dt className="text-[var(--muted)]">Location</dt>
                <dd className="font-medium text-[var(--foreground)]">{workOrder.location}</dd>
              </div>
            ) : null}
            {workOrder.asset_name ? (
              <div>
                <dt className="text-[var(--muted)]">Asset</dt>
                <dd className="font-medium text-[var(--foreground)]">{workOrder.asset_name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[var(--muted)]">Source</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {workOrder.source_type === "preventive_maintenance" ? (
                  workOrder.preventive_maintenance_plan_id ? (
                    <Link
                      href={`/preventive-maintenance/${workOrder.preventive_maintenance_plan_id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      PM
                    </Link>
                  ) : (
                    "PM"
                  )
                ) : (
                  "Manual"
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
            <Link
              href={`/work-orders/${workOrder.id}`}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              View full
            </Link>
            <button
              type="button"
              onClick={() => { onEdit(); onClose(); }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => { onAssign(); onClose(); }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
