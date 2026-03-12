"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleWorkOrderChecklistItem,
  updateWorkOrderStatus,
} from "@/app/(authenticated)/work-orders/actions";
import { WorkOrderCompletionModal } from "@/app/(authenticated)/work-orders/components/work-order-completion-modal";
import { WorkOrderChecklistCard } from "@/app/(authenticated)/work-orders/components/work-order-checklist-card";
import { WorkOrderNotesCard } from "@/app/(authenticated)/work-orders/components/work-order-notes-card";
import { WorkOrderPartsCard } from "@/app/(authenticated)/work-orders/components/work-order-parts-card";
import { WorkOrderPriorityBadge } from "@/app/(authenticated)/work-orders/components/work-order-priority-badge";
import { WorkOrderStatusBadge } from "@/app/(authenticated)/work-orders/components/work-order-status-badge";

type Note = { id: string; body: string; note_type: string | null; created_at: string };
type ChecklistItem = { id: string; label: string; completed: boolean; sort_order: number };
type PartUsage = {
  id: string;
  product_id?: string | null;
  quantity_used: number;
  unit_cost_snapshot?: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  notes?: string | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
  stock_location_name?: string | null;
};
type InventoryItem = {
  id: string;
  product_id: string;
  stock_location_id: string;
  name: string;
  location_name: string;
  sku: string | null;
  unit: string | null;
  cost: number | null;
  quantity: number;
};
type TechnicianOption = { id: string; name: string };

type ExecutionWorkOrder = {
  id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  description: string | null;
  instructions: string | null;
  source_type: string | null;
  asset_name: string | null;
  location: string | null;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  assigned_crew_name: string | null;
  estimated_hours: number | null;
  started_at: string | null;
  last_paused_at: string | null;
  asset_summary: {
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    status: string | null;
    condition: string | null;
  };
};

type TechnicianExecutionViewProps = {
  workOrder: ExecutionWorkOrder;
  checklistItems: ChecklistItem[];
  notes: Note[];
  partUsage: PartUsage[];
  inventoryItems: InventoryItem[];
  technicians: TechnicianOption[];
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function TechnicianExecutionView({
  workOrder,
  checklistItems,
  notes,
  partUsage,
  inventoryItems,
  technicians,
}: TechnicianExecutionViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completionOpen, setCompletionOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  const isCompleted = workOrder.status === "completed";
  const isInProgress = workOrder.status === "in_progress";
  const isOnHold = workOrder.status === "on_hold";
  const canStart = !isCompleted && !isInProgress;
  const canPause = !isCompleted && isInProgress;

  const runStatusUpdate = (nextStatus: "in_progress" | "on_hold") => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateWorkOrderStatus(workOrder.id, nextStatus);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({
        type: "success",
        text:
          nextStatus === "in_progress"
            ? "Job started and status updated to in progress."
            : "Job paused and status updated to on hold.",
      });
      router.refresh();
    });
  };

  const toggleChecklist = (itemId: string, completed: boolean) => {
    startTransition(async () => {
      const result = await toggleWorkOrderChecklistItem(itemId, !completed);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <header className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Technician execution
            </p>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {workOrder.work_order_number ?? "Work order"}
            </h1>
            <p className="mt-1 text-[var(--foreground)]">{workOrder.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {workOrder.asset_name ?? "No asset"} • {workOrder.location ?? "No location"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <WorkOrderStatusBadge status={workOrder.status} />
              <WorkOrderPriorityBadge priority={workOrder.priority} />
              <span className="rounded bg-[var(--muted)]/20 px-2 py-0.5 text-xs text-[var(--muted)]">
                {workOrder.source_type === "preventive_maintenance" ||
                workOrder.category === "preventive_maintenance"
                  ? "PM"
                  : "Reactive"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runStatusUpdate("in_progress")}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {isOnHold ? "Resume Job" : "Start Job"}
              </button>
            )}
            {canPause && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runStatusUpdate("on_hold")}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-50"
              >
                Pause Job
              </button>
            )}
            {!isCompleted && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setCompletionOpen(true)}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-50"
              >
                Complete Job
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Execution details</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium text-[var(--muted)]">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {workOrder.description ?? "No description"}
            </p>
            <h3 className="mt-4 text-xs font-medium text-[var(--muted)]">Instructions</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {workOrder.instructions ?? "No instructions"}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--muted)]">Asset summary</h3>
            <dl className="mt-1 space-y-1 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Manufacturer / Model</dt>
                <dd className="text-[var(--foreground)]">
                  {[workOrder.asset_summary.manufacturer, workOrder.asset_summary.model]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Serial</dt>
                <dd className="text-[var(--foreground)]">
                  {workOrder.asset_summary.serial_number ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Status / Condition</dt>
                <dd className="text-[var(--foreground)]">
                  {[workOrder.asset_summary.status, workOrder.asset_summary.condition]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Started at</dt>
                <dd className="text-[var(--foreground)]">{formatDateTime(workOrder.started_at)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Last paused at</dt>
                <dd className="text-[var(--foreground)]">
                  {formatDateTime(workOrder.last_paused_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Assigned technician / crew</dt>
                <dd className="text-[var(--foreground)]">
                  {[workOrder.assigned_technician_name, workOrder.assigned_crew_name]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkOrderChecklistCard
          workOrderId={workOrder.id}
          items={checklistItems}
          onToggle={toggleChecklist}
          onItemsChange={() => router.refresh()}
          isPending={isPending}
        />
        <WorkOrderPartsCard
          workOrderId={workOrder.id}
          partUsage={partUsage}
          onPartsChange={() => router.refresh()}
          inventoryItems={inventoryItems}
        />
      </div>

      <WorkOrderNotesCard
        workOrderId={workOrder.id}
        notes={notes}
        onNotesChange={() => router.refresh()}
      />

      {completionOpen && (
        <WorkOrderCompletionModal
          workOrderId={workOrder.id}
          workOrderTitle={workOrder.title}
          technicians={technicians}
          assignedTechnicianId={workOrder.assigned_technician_id}
          estimatedHours={workOrder.estimated_hours}
          inventoryItems={inventoryItems}
          onClose={() => setCompletionOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
