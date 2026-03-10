"use client";

import { useDraggable } from "@dnd-kit/core";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";

/** Work order shape for queue items (compatible with LoadDispatchResult lists). */
type QueueWorkOrder = {
  id: string;
  [key: string]: unknown;
};

export type DispatchSidebarQueueProps = {
  unscheduled: QueueWorkOrder[];
  overdue: QueueWorkOrder[];
  ready: QueueWorkOrder[];
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
};

function DraggableQueueCard({ workOrder, children }: { workOrder: QueueWorkOrder; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `queue-wo-${workOrder.id}`,
    data: { type: "dispatch-work-order", workOrder },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-50" : undefined}>
      {children}
    </div>
  );
}

function QueueSection({
  title,
  items,
  variant,
  onOpenWorkOrder,
}: {
  title: string;
  items: QueueWorkOrder[];
  variant: "overdue" | "ready" | "unscheduled";
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
}) {
  const borderColor =
    variant === "overdue"
      ? "border-amber-500/40 bg-amber-500/5"
      : variant === "ready"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-[var(--card-border)] bg-[var(--card)]/30";
  return (
    <section className="shrink-0">
      <h3
        className={`sticky top-0 z-10 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider ${borderColor} text-[var(--muted)]`}
      >
        {title}
        <span className="ml-2 font-normal tabular-nums">{items.length}</span>
      </h3>
      <ul className="flex flex-col gap-2 p-2">
        {items.length === 0 ? (
          <li className="py-4 text-center text-xs text-[var(--muted)]">None</li>
        ) : (
          items.map((wo) => (
            <li key={wo.id}>
              <DraggableQueueCard workOrder={wo}>
                <DispatchWorkOrderCard
                  workOrder={wo}
                  variant="block"
                  showScheduledTime
                  showCrew={false}
                  showQuickActions={!!onOpenWorkOrder}
                  onOpenWorkOrder={onOpenWorkOrder}
                />
              </DraggableQueueCard>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function DispatchSidebarQueue({ unscheduled, overdue, ready, onOpenWorkOrder }: DispatchSidebarQueueProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-[var(--card)]/50">
      <QueueSection title="Overdue" items={overdue} variant="overdue" onOpenWorkOrder={onOpenWorkOrder} />
      <QueueSection title="Ready" items={ready} variant="ready" onOpenWorkOrder={onOpenWorkOrder} />
      <QueueSection title="Unscheduled" items={unscheduled} variant="unscheduled" onOpenWorkOrder={onOpenWorkOrder} />
    </aside>
  );
}
