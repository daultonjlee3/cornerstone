"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { updateWorkOrderStatus, toggleWorkOrderChecklistItem } from "../actions";
import { WorkOrderCompletionModal } from "./work-order-completion-modal";
import { WorkOrderAssignmentModal } from "./work-order-assignment-modal";
import { WorkOrderHeader } from "./work-order-header";
import { WorkOrderOverviewCard } from "./work-order-overview-card";
import { WorkOrderLocationCard } from "./work-order-location-card";
import { WorkOrderSchedulingCard } from "./work-order-scheduling-card";
import { WorkOrderChecklistCard } from "./work-order-checklist-card";
import { WorkOrderPartsCard } from "./work-order-parts-card";
import { WorkOrderCostSummary } from "./work-order-cost-summary";
import { WorkOrderNotesCard } from "./work-order-notes-card";
import { WorkOrderStatusTimeline } from "./work-order-status-timeline";
import { WorkOrderCompletionCard } from "./work-order-completion-card";

const STATUS_OPTIONS_FOR_DROPDOWN = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "cancelled",
] as const;

type TechnicianOption = { id: string; name: string };
type CrewOption = { id: string; name: string; company_id: string | null };

type WorkOrderDetailViewProps = {
  workOrder: Record<string, unknown>;
  notes: { id: string; body: string; note_type: string | null; created_at: string }[];
  checklistItems: { id: string; label: string; completed: boolean; sort_order: number }[];
  partUsage: PartUsageForDetail[];
  statusHistory: { id: string; from_status: string | null; to_status: string; changed_at: string }[];
  attachments: { id: string; file_name: string; file_url: string; file_type: string | null; created_at: string }[];
  technicians: TechnicianOption[];
  crews: CrewOption[];
  inventoryItems: {
    id: string;
    product_id: string;
    stock_location_id: string;
    name: string;
    location_name: string;
    sku: string | null;
    unit: string | null;
    cost: number | null;
    quantity: number;
  }[];
};

export type PartUsageForDetail = {
  id: string;
  product_id?: string | null;
  quantity_used: number;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
  stock_location_name?: string | null;
};

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

export function WorkOrderDetailView({
  workOrder,
  notes,
  checklistItems,
  partUsage,
  statusHistory,
  attachments,
  technicians,
  crews,
  inventoryItems,
}: WorkOrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const id = workOrder.id as string;
  const status = (workOrder.status as string) ?? "new";
  const priority = (workOrder.priority as string) ?? "medium";
  const isCompleted = status === "completed";

  const setStatus = (newStatus: string) => {
    setStatusDropdown(false);
    startTransition(async () => {
      const result = await updateWorkOrderStatus(id, newStatus);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Status updated." });
        router.refresh();
      }
    });
  };

  const toggleChecklist = (itemId: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleWorkOrderChecklistItem(itemId, !current);
      if (result.error) setMessage({ type: "error", text: result.error });
      else router.refresh();
    });
  };

  const openAssignmentModal = () => setAssignmentModalOpen(true);

  return (
    <>
      {completionModalOpen && (
        <WorkOrderCompletionModal
          workOrderId={id}
          workOrderTitle={(workOrder.title as string) ?? ""}
          technicians={technicians}
          assignedTechnicianId={(workOrder.assigned_technician_id as string) ?? null}
          estimatedHours={(workOrder.estimated_hours as number) ?? null}
          onClose={() => setCompletionModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
      <div className="space-y-6">
        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm ${
              message.type === "error"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-[var(--accent)]/10 text-[var(--accent)]"
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        <WorkOrderHeader
          workOrderId={id}
          workOrderNumber={(workOrder.work_order_number as string) ?? "—"}
          title={(workOrder.title as string) ?? ""}
          status={status}
          priority={priority}
          category={(workOrder.category as string) ?? null}
          isCompleted={isCompleted}
          onAssignTechnician={openAssignmentModal}
          onAssignCrew={openAssignmentModal}
          onChangeStatusClick={() => setStatusDropdown((v) => !v)}
          onCompleteClick={() => setCompletionModalOpen(true)}
          isPending={isPending}
        />

        {statusDropdown && (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">Change status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS_FOR_DROPDOWN.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  disabled={isPending}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-50"
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {assignmentModalOpen && (
          <WorkOrderAssignmentModal
            open={assignmentModalOpen}
            onClose={() => setAssignmentModalOpen(false)}
            workOrderId={id}
            workOrderStatus={status}
            companyId={(workOrder.company_id as string) ?? null}
            initial={{
              assigned_technician_id: (workOrder.assigned_technician_id as string) ?? null,
              assigned_crew_id: (workOrder.assigned_crew_id as string) ?? null,
              scheduled_date: (workOrder.scheduled_date as string) ?? null,
              scheduled_start: (workOrder.scheduled_start as string) ?? null,
              scheduled_end: (workOrder.scheduled_end as string) ?? null,
            }}
            technicians={technicians}
            crews={crews}
            onSuccess={() => {
              setMessage({ type: "success", text: "Assignment updated." });
              router.refresh();
            }}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkOrderOverviewCard workOrder={workOrder} />
          <WorkOrderLocationCard workOrder={workOrder} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkOrderSchedulingCard workOrder={workOrder} onAssignTechnician={openAssignmentModal} />
          <WorkOrderCompletionCard
            workOrder={workOrder}
            status={status}
            onCompleteClick={() => setCompletionModalOpen(true)}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkOrderChecklistCard
            workOrderId={id}
            items={checklistItems}
            onToggle={toggleChecklist}
            onItemsChange={() => router.refresh()}
            isPending={isPending}
          />
          <WorkOrderPartsCard
            workOrderId={id}
            partUsage={partUsage}
            onPartsChange={() => router.refresh()}
            inventoryItems={inventoryItems}
          />
          <WorkOrderCostSummary
            partsTotal={partUsage.reduce((sum, p) => sum + (p.total_cost ?? 0), 0)}
            actualHours={workOrder.actual_hours as number | null | undefined}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkOrderNotesCard workOrderId={id} notes={notes} onNotesChange={() => router.refresh()} />
          <WorkOrderStatusTimeline entries={statusHistory} />
        </div>

        <div className={cardClass}>
          <h2 className={cardTitleClass}>Attachments</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No attachments.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    {a.file_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80"
          >
            Upload (placeholder)
          </button>
        </div>
      </div>
    </>
  );
}
