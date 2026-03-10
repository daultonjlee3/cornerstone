"use client";

import { useDraggable } from "@dnd-kit/core";
import { QueueSection } from "./QueueSection";

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

export function DispatchSidebarQueue({ unscheduled, overdue, ready, onOpenWorkOrder }: DispatchSidebarQueueProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-gradient-to-b from-[var(--card)] to-slate-50/60">
      <div className="sticky top-0 z-20 border-b border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-3 backdrop-blur">
        <p className="text-sm font-semibold text-[var(--foreground)]">Dispatch Queue</p>
        <p className="text-xs text-[var(--muted)]">
          Prioritize overdue jobs, then drag into a lane to schedule.
        </p>
      </div>
      <div className="py-3">
        <QueueSection
          title="Overdue"
          items={overdue}
          variant="overdue"
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
        <QueueSection
          title="Ready"
          items={ready}
          variant="ready"
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
        <QueueSection
          title="Unscheduled"
          items={unscheduled}
          variant="unscheduled"
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
      </div>
    </aside>
  );
}
