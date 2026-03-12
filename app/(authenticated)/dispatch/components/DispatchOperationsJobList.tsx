"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { DispatchWorkOrder } from "../types";

type DispatchOperationsJobListProps = {
  workOrders: DispatchWorkOrder[];
  selectedWorkOrderId: string | null;
  hoveredWorkOrderId: string | null;
  onSelectWorkOrder: (workOrderId: string) => void;
  onHoverWorkOrder: (workOrderId: string | null) => void;
  onOpenWorkOrder: (workOrderId: string) => void;
};

function formatWindow(workOrder: DispatchWorkOrder): string {
  if (!workOrder.scheduled_start && !workOrder.scheduled_end) return "Unscheduled";
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const start = fmt(workOrder.scheduled_start);
  const end = fmt(workOrder.scheduled_end);
  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "Unscheduled";
}

function formatProperty(workOrder: DispatchWorkOrder): string {
  return [workOrder.property_name, workOrder.building_name, workOrder.unit_name]
    .filter(Boolean)
    .join(" / ") || "Unknown location";
}

const DispatchOperationsJobRow = memo(function DispatchOperationsJobRow({
  workOrder,
  selected,
  hovered,
  onSelectWorkOrder,
  onHoverWorkOrder,
  onOpenWorkOrder,
}: {
  workOrder: DispatchWorkOrder;
  selected: boolean;
  hovered: boolean;
  onSelectWorkOrder: (workOrderId: string) => void;
  onHoverWorkOrder: (workOrderId: string | null) => void;
  onOpenWorkOrder: (workOrderId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ops-list-wo-${workOrder.id}`,
    data: { type: "dispatch-work-order", workOrder },
  });

  return (
    <article
      ref={setNodeRef}
      data-dispatch-work-order-row-id={workOrder.id}
      {...attributes}
      {...listeners}
      className={`rounded-lg border bg-[var(--card)] p-2 shadow-[var(--shadow-soft)] transition ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
          : hovered
            ? "border-blue-300 bg-blue-50/40"
            : "border-[var(--card-border)] hover:border-[var(--accent)]/45"
      } ${isDragging ? "opacity-60" : ""}`}
      onMouseEnter={() => onHoverWorkOrder(workOrder.id)}
      onMouseLeave={() => onHoverWorkOrder(null)}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Drag ${workOrder.work_order_number ?? "work order"}`}
          className="mt-0.5 shrink-0 rounded border border-[var(--card-border)] bg-[var(--background)] px-1 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ::
        </button>
        <button
          type="button"
          onClick={() => onSelectWorkOrder(workOrder.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {workOrder.work_order_number ?? `WO-${workOrder.id.slice(0, 8)}`}
          </p>
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {workOrder.title ?? "Untitled work order"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{formatProperty(workOrder)}</p>
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={workOrder.priority ?? "medium"} />
        <StatusBadge status={workOrder.status ?? "new"} />
        <span className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-strong)]">
          {workOrder.assigned_technician_name ??
            (workOrder.assigned_crew_name ? `${workOrder.assigned_crew_name} (crew)` : "Unassigned")}
        </span>
        <span className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-strong)]">
          {formatWindow(workOrder)}
        </span>
      </div>
      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={() => onOpenWorkOrder(workOrder.id)}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
        >
          Open
        </button>
      </div>
    </article>
  );
});

export function DispatchOperationsJobList({
  workOrders,
  selectedWorkOrderId,
  hoveredWorkOrderId,
  onSelectWorkOrder,
  onHoverWorkOrder,
  onOpenWorkOrder,
}: DispatchOperationsJobListProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Work order list</p>
        <span className="text-[11px] text-[var(--muted)]">{workOrders.length} jobs</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {workOrders.length === 0 ? (
          <p className="rounded border border-dashed border-[var(--card-border)] bg-[var(--background)]/60 p-3 text-center text-xs text-[var(--muted)]">
            No jobs for current filters.
          </p>
        ) : (
          workOrders.map((workOrder) => (
            <DispatchOperationsJobRow
              key={workOrder.id}
              workOrder={workOrder}
              selected={selectedWorkOrderId === workOrder.id}
              hovered={hoveredWorkOrderId === workOrder.id}
              onSelectWorkOrder={onSelectWorkOrder}
              onHoverWorkOrder={onHoverWorkOrder}
              onOpenWorkOrder={onOpenWorkOrder}
            />
          ))
        )}
      </div>
    </section>
  );
}
