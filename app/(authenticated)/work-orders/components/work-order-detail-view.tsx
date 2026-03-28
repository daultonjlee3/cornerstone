"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import {
  updateWorkOrderStatus,
  toggleWorkOrderChecklistItem,
  uploadWorkOrderAttachment,
} from "../actions";
import { WorkOrderCompletionModal } from "./work-order-completion-modal";
import { WorkOrderAssignmentModal } from "./work-order-assignment-modal";
import { WorkOrderHeader } from "./work-order-header";
import { WorkOrderOverviewCard } from "./work-order-overview-card";
import { WorkOrderLocationCard } from "./work-order-location-card";
import { WorkOrderSchedulingCard } from "./work-order-scheduling-card";
import { WorkOrderChecklistCard } from "./work-order-checklist-card";
import { WorkOrderMaterialsCard } from "./work-order-materials-card";
import { WorkOrderPartsCard } from "./work-order-parts-card";
import { WorkOrderCostSummary } from "./work-order-cost-summary";
import { WorkOrderNotesCard } from "./work-order-notes-card";
import { WorkOrderStatusTimeline } from "./work-order-status-timeline";
import { WorkOrderCompletionCard } from "./work-order-completion-card";
import { AttachmentUploader } from "@/src/components/ui/attachment-uploader";
import { HelperTip } from "@/src/components/ui/helper-tip";
import { CornerstoneAiPanel } from "@/app/(authenticated)/components/cornerstone-ai-panel";

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
type VendorOption = {
  id: string;
  name: string;
  company_id: string;
  service_type?: string | null;
};

type WorkOrderDetailViewProps = {
  workOrder: Record<string, unknown>;
  notes: { id: string; body: string; note_type: string | null; created_at: string }[];
  checklistItems: { id: string; label: string; completed: boolean; sort_order: number }[];
  partUsage: PartUsageForDetail[];
  statusHistory: { id: string; from_status: string | null; to_status: string; changed_at: string }[];
  attachments: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    caption?: string | null;
    uploaded_at?: string | null;
    created_at: string;
  }[];
  technicians: TechnicianOption[];
  crews: CrewOption[];
  vendors: VendorOption[];
  sla: {
    responseTargetMinutes: number;
    responseDueAt: string | null;
    responseTimeMinutes: number | null;
    resolutionTimeMinutes: number | null;
    responseBreached: boolean;
    responsePending: boolean;
    responseExceededByMinutes: number | null;
  };
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
  materialLines: import("../actions").WorkOrderMaterialLineWithAvailability[];
  productsForMaterials: { id: string; name: string; sku: string | null; default_cost: number | null }[];
  stockLocationsForMaterials: { id: string; name: string }[];
  laborMinutes?: number | null;
  parentWorkOrder?: {
    id: string;
    work_order_number: string | null;
    title: string;
    status: string;
  } | null;
  childWorkOrders?: {
    id: string;
    work_order_number: string | null;
    title: string;
    status: string;
    technician_name?: string | null;
    crew_name?: string | null;
    due_date: string | null;
  }[];
  childSummary?: {
    total: number;
    completed: number;
    aggregateStatus: string | null;
    overdue: number;
  } | null;
};

export type PartUsageForDetail = {
  id: string;
  product_id?: string | null;
  quantity_used: number;
  unit_cost_snapshot?: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
  stock_location_name?: string | null;
  notes?: string | null;
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
  vendors,
  sla,
  inventoryItems,
  materialLines,
  productsForMaterials,
  stockLocationsForMaterials,
  laborMinutes = null,
  parentWorkOrder = null,
  childWorkOrders = [],
  childSummary = null,
}: WorkOrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const id = workOrder.id as string;
  const status = (workOrder.status as string) ?? "new";
  const priority = (workOrder.priority as string) ?? "medium";
  const isCompleted = status === "completed";

  // UI-provided summary context: avoid re-fetching from the backend (RLS/permissions can block).
  const location = [
    (workOrder.property_name as string | null | undefined) ?? null,
    (workOrder.building_name as string | null | undefined) ?? null,
    (workOrder.unit_name as string | null | undefined) ?? null,
  ]
    .filter(Boolean)
    .join(" / ");
  const locationOrNull = location ? location : null;

  const assignedTechnicianName =
    (workOrder.technician_name as string | null | undefined) ?? null;
  const assignedCrewName = (workOrder.crew_name as string | null | undefined) ?? null;
  const assigned_to =
    assignedTechnicianName ?? (assignedCrewName ? `Crew: ${assignedCrewName}` : null);

  const assetName = (workOrder.asset_name as string | null | undefined) ?? null;
  const descriptionBase = (workOrder.description as string | null | undefined) ?? null;
  const description =
    assetName && descriptionBase
      ? `Asset: ${assetName}. ${descriptionBase}`
      : assetName
        ? `Asset: ${assetName}.`
        : descriptionBase;

  const notesExcerptFromNotes = (notes ?? [])
    .map((n) => (n.body ?? "").trim())
    .filter(Boolean)
    .slice(-3)
    .join(" | ")
    .slice(0, 500);

  const notesExcerptFromStatus =
    (statusHistory ?? []).length > 0
      ? (statusHistory ?? [])
          .slice(-2)
          .map((h) => `${h.from_status ?? "—"} → ${h.to_status ?? "—"}`)
          .join(" | ")
          .slice(0, 500)
      : null;

  const notesExcerpt = notesExcerptFromNotes || notesExcerptFromStatus || null;

  const workOrderRecordSummaryPayload = {
    id,
    work_order_number:
      (workOrder.work_order_number as string | null | undefined) ?? null,
    title: (workOrder.title as string | null | undefined) ?? null,
    status,
    priority,
    due_date: (workOrder.due_date as string | null | undefined) ?? null,
    location: locationOrNull,
    assigned_to,
    company_name: (workOrder.company_name as string | null | undefined) ?? null,
    description: description ?? null,
    notesExcerpt,
  };
  const showUnassignedTip =
    !isCompleted &&
    !(workOrder.assigned_technician_id as string | null) &&
    !(workOrder.assigned_crew_id as string | null);
  const subWorkOrderParams = new URLSearchParams({
    new: "1",
    parent_work_order_id: id,
    company_id: (workOrder.company_id as string | null) ?? "",
    property_id: (workOrder.property_id as string | null) ?? "",
    building_id: (workOrder.building_id as string | null) ?? "",
    unit_id: (workOrder.unit_id as string | null) ?? "",
    asset_id: (workOrder.asset_id as string | null) ?? "",
  });
  const subWorkOrderCreateHref = `/work-orders?${subWorkOrderParams.toString()}`;

  const formatDuration = (minutes: number | null) => {
    if (minutes == null) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  };

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
          inventoryItems={inventoryItems}
          onClose={() => setCompletionModalOpen(false)}
          onSuccess={() => {
            router.refresh();
            window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
            window.dispatchEvent(new CustomEvent("cornerstone:demo-90:wo-completed"));
          }}
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

        {showUnassignedTip && (
          <HelperTip
            id="helper-tip-work-order-unassigned"
            message="This work order is unassigned."
          />
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
          onSummarize={() => setAiPanelOpen(true)}
          isPending={isPending}
        />
        {parentWorkOrder ? (
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Parent Work Order</h2>
            <Link
              href={`/work-orders/${parentWorkOrder.id}`}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {parentWorkOrder.work_order_number ?? "Work Order"} - {parentWorkOrder.title}
            </Link>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Status: {parentWorkOrder.status.replace(/_/g, " ")}
            </p>
          </div>
        ) : null}

        {childSummary && childSummary.total > 0 ? (
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={cardTitleClass}>Sub Work Orders</h2>
              <Link
                href={subWorkOrderCreateHref}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                + Add Sub Work Order
              </Link>
            </div>
            <p className="mb-3 text-sm text-[var(--muted)]">
              {childSummary.completed}/{childSummary.total} complete · Aggregate status:{" "}
              {(childSummary.aggregateStatus ?? "open").replace(/_/g, " ")}
              {childSummary.overdue > 0 ? ` · ${childSummary.overdue} overdue` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Assignee</th>
                    <th className="px-2 py-2">Due Date</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {childWorkOrders.map((child) => (
                    <tr key={child.id} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="px-2 py-2">
                        {child.work_order_number ? `${child.work_order_number} · ` : ""}
                        {child.title}
                      </td>
                      <td className="px-2 py-2">{child.status.replace(/_/g, " ")}</td>
                      <td className="px-2 py-2 text-[var(--muted)]">
                        {child.technician_name ?? child.crew_name ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-[var(--muted)]">
                        {child.due_date ? new Date(child.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Link href={`/work-orders/${child.id}`} className="text-[var(--accent)] hover:underline">
                          Open
                        </Link>
                        {" · "}
                        <Link href={`/work-orders?edit=${child.id}`} className="text-[var(--accent)] hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Sub Work Orders</h2>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">No sub work orders yet.</p>
              <Link
                href={subWorkOrderCreateHref}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                + Add Sub Work Order
              </Link>
            </div>
          </div>
        )}
        <CornerstoneAiPanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          context={{
            entityType: "work_order",
            entityId: id,
            recordSummary: {
              workOrder: workOrderRecordSummaryPayload,
            },
            actionContext: {
              workOrders: [
                {
                  id,
                  work_order_number: workOrderRecordSummaryPayload.work_order_number ?? null,
                  title: workOrderRecordSummaryPayload.title ?? null,
                  status: workOrderRecordSummaryPayload.status ?? null,
                  priority: workOrderRecordSummaryPayload.priority ?? null,
                  due_date: workOrderRecordSummaryPayload.due_date ?? null,
                  assigned_technician_id: (workOrder.assigned_technician_id as string | null) ?? null,
                  assigned_crew_id: (workOrder.assigned_crew_id as string | null) ?? null,
                  vendor_id: (workOrder.vendor_id as string | null) ?? null,
                  assigned_to_label: assigned_to,
                  location: workOrderRecordSummaryPayload.location ?? null,
                },
              ],
              technicians: technicians.map((t) => ({
                id: t.id,
                label: t.name,
              })),
            },
          }}
          initialQuery="Summarize this work order for a supervisor."
        />
        {sla.responseBreached ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
            Response SLA breached
            {sla.responseExceededByMinutes != null
              ? ` by ${formatDuration(sla.responseExceededByMinutes)}.`
              : "."}
          </div>
        ) : null}

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
              assigned_vendor_id: (workOrder.vendor_id as string) ?? null,
              scheduled_date: (workOrder.scheduled_date as string) ?? null,
              scheduled_start: (workOrder.scheduled_start as string) ?? null,
              scheduled_end: (workOrder.scheduled_end as string) ?? null,
            }}
            technicians={technicians}
            crews={crews}
            vendors={vendors}
            onSuccess={() => {
              setMessage({ type: "success", text: "Assignment updated." });
              router.refresh();
            window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
            }}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <WorkOrderOverviewCard workOrder={workOrder} />
          <WorkOrderLocationCard workOrder={workOrder} />
          <div className={cardClass}>
            <h2 className={cardTitleClass}>SLA</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Response target</dt>
                <dd className="text-[var(--foreground)]">{formatDuration(sla.responseTargetMinutes)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Response due by</dt>
                <dd className="text-[var(--foreground)]">
                  {sla.responseDueAt ? new Date(sla.responseDueAt).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">First response time</dt>
                <dd className="text-[var(--foreground)]">
                  {sla.responsePending ? "Pending" : formatDuration(sla.responseTimeMinutes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Resolution time</dt>
                <dd className="text-[var(--foreground)]">{formatDuration(sla.resolutionTimeMinutes)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">SLA status</dt>
                <dd
                  className={
                    sla.responseBreached
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "font-medium text-emerald-700 dark:text-emerald-400"
                  }
                >
                  {sla.responseBreached ? "Breached" : sla.responsePending ? "Pending" : "Met"}
                </dd>
              </div>
            </dl>
          </div>
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
          <WorkOrderMaterialsCard
            workOrderId={id}
            companyId={String(workOrder.company_id ?? "")}
            materialLines={materialLines}
            products={productsForMaterials}
            stockLocations={stockLocationsForMaterials}
            onMaterialsChange={() => router.refresh()}
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
            laborMinutes={laborMinutes}
            vendorCost={(workOrder.vendor_cost as number | null | undefined) ?? null}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkOrderNotesCard workOrderId={id} notes={notes} onNotesChange={() => router.refresh()} />
          <div data-work-order-id={id} className="min-w-0">
            <WorkOrderStatusTimeline entries={statusHistory} />
          </div>
        </div>

        <div className={cardClass}>
          <h2 className={cardTitleClass}>Attachments</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No attachments.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li key={a.id} className="rounded border border-[var(--card-border)] bg-[var(--background)] p-2">
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    {a.caption?.trim() || a.file_name}
                  </a>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {(a.file_type ?? "file").replace("application/", "")}
                    {" • "}
                    {new Date(a.uploaded_at ?? a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <AttachmentUploader
            className="mt-3"
            label="Upload image, PDF, or document"
            submitLabel="Upload attachment"
            onUpload={async (payload) => {
              const result = await uploadWorkOrderAttachment(id, payload);
              if (result.error) throw new Error(result.error);
              setMessage({ type: "success", text: "Attachment uploaded." });
              router.refresh();
            }}
          />
        </div>
      </div>
    </>
  );
}
