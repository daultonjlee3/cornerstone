"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateWorkOrderStatus,
  uploadWorkOrderPhoto,
} from "@/app/(authenticated)/work-orders/actions";
import { WorkOrderCompletionModal } from "@/app/(authenticated)/work-orders/components/work-order-completion-modal";
import { WorkOrderChecklistCard } from "@/app/(authenticated)/work-orders/components/work-order-checklist-card";
import { WorkOrderPartsCard } from "@/app/(authenticated)/work-orders/components/work-order-parts-card";
import { toggleWorkOrderChecklistItem } from "@/app/(authenticated)/work-orders/actions";
import { WorkOrderStatusBadge } from "@/app/(authenticated)/work-orders/components/work-order-status-badge";
import { WorkOrderPriorityBadge } from "@/app/(authenticated)/work-orders/components/work-order-priority-badge";
import { PhotoUploader } from "@/src/components/ui/photo-uploader";
import { Button } from "@/src/components/ui/button";
import { NotesTimeline } from "./notes-timeline";
import type {
  TechnicianPortalAttachment,
  TechnicianPortalLaborEntry,
} from "./job-types";

type ChecklistItem = { id: string; label: string; completed: boolean; sort_order: number };
type PartUsage = {
  id: string;
  quantity_used: number;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
};
type InventoryItem = {
  id: string;
  name: string;
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
  technician_id_for_actor: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  notesTimeline: {
    id: string;
    body: string;
    note_type: string | null;
    created_at: string;
    technician_id: string | null;
  }[];
  activityTimeline: {
    id: string;
    action_type: string;
    performed_at: string;
    metadata: Record<string, unknown> | null;
  }[];
  asset_summary: {
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    status: string | null;
    condition: string | null;
  };
};

type TechnicianJobExecutionViewProps = {
  workOrder: ExecutionWorkOrder;
  checklistItems: ChecklistItem[];
  partUsage: PartUsage[];
  inventoryItems: InventoryItem[];
  technicians: TechnicianOption[];
  laborEntries: TechnicianPortalLaborEntry[];
  attachments: TechnicianPortalAttachment[];
};

function minutesToDisplay(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function sumPersistedMinutes(entries: TechnicianPortalLaborEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (entry.duration_minutes != null) return sum + Number(entry.duration_minutes);
    if (entry.started_at && entry.ended_at) {
      const duration =
        (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000;
      return sum + Math.max(0, Math.round(duration));
    }
    return sum;
  }, 0);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function TechnicianJobExecutionView({
  workOrder,
  checklistItems,
  partUsage,
  inventoryItems,
  technicians,
  laborEntries,
  attachments,
}: TechnicianJobExecutionViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [completionOpen, setCompletionOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isCompleted = workOrder.status === "completed";
  const isInProgress = workOrder.status === "in_progress";
  const isOnHold = workOrder.status === "on_hold";

  const activeEntry = useMemo(
    () =>
      laborEntries
        .filter((entry) => entry.is_active && !entry.ended_at)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] ??
      null,
    [laborEntries]
  );
  const persistedMinutes = useMemo(() => sumPersistedMinutes(laborEntries), [laborEntries]);

  useEffect(() => {
    if (!isInProgress || !activeEntry) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isInProgress, activeEntry]);

  const runningMinutes = useMemo(() => {
    if (!isInProgress || !activeEntry) return persistedMinutes;
    const elapsed = Math.max(
      0,
      Math.round((now - new Date(activeEntry.started_at).getTime()) / 60000)
    );
    return persistedMinutes + elapsed;
  }, [persistedMinutes, isInProgress, activeEntry, now]);

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
            ? isOnHold
              ? "Work resumed."
              : "Work started."
            : "Work paused.",
      });
      router.refresh();
    });
  };

  const uploadPhoto = async (payload: {
    fileDataUrl: string;
    fileName: string;
    mimeType: string;
    caption: string;
  }) => {
    const result = await uploadWorkOrderPhoto(workOrder.id, {
      ...payload,
      technicianId: workOrder.technician_id_for_actor,
    });
    if (result.error) throw new Error(result.error);
    router.refresh();
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
    <div className="space-y-4 pb-8">
      <header className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {workOrder.work_order_number ?? "Work order"}
        </p>
        <h1 className="text-xl font-semibold leading-tight text-[var(--foreground)]">
          {workOrder.title}
        </h1>
        <p className="text-sm text-[var(--muted-strong)]">
          {[workOrder.asset_name, workOrder.location].filter(Boolean).join(" • ") || "No asset/location"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <WorkOrderStatusBadge status={workOrder.status} />
          <WorkOrderPriorityBadge priority={workOrder.priority} />
          <span className="rounded-full border border-[var(--card-border)] bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--muted-strong)]">
            {workOrder.source_type === "preventive_maintenance" ||
            workOrder.category === "preventive_maintenance"
              ? "PM"
              : "Reactive"}
          </span>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/70 px-3 py-2">
          <p className="text-xs text-[var(--muted)]">Labor logged</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {minutesToDisplay(runningMinutes)}
          </p>
          <p className="text-xs text-[var(--muted)]">
            Started: {formatDateTime(workOrder.started_at)} • Last paused:{" "}
            {formatDateTime(workOrder.last_paused_at)}
          </p>
        </div>
      </header>

      {message ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {!isCompleted && !isInProgress ? (
          <Button
            type="button"
            className="h-12 text-base"
            onClick={() => runStatusUpdate("in_progress")}
            disabled={pending}
          >
            {isOnHold ? "Resume Work" : "Start Work"}
          </Button>
        ) : null}
        {!isCompleted && isInProgress ? (
          <Button
            type="button"
            variant="secondary"
            className="h-12 text-base"
            onClick={() => runStatusUpdate("on_hold")}
            disabled={pending}
          >
            Pause Work
          </Button>
        ) : null}
        {!isCompleted ? (
          <Button
            type="button"
            variant="secondary"
            className="h-12 text-base sm:col-span-2"
            onClick={() => setCompletionOpen(true)}
            disabled={pending}
          >
            Complete Work Order
          </Button>
        ) : null}
      </section>

      <section className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Job details</h2>
        <p className="text-sm text-[var(--muted-strong)]">{workOrder.description ?? "No description provided."}</p>
        <p className="text-sm text-[var(--muted)]">{workOrder.instructions ?? "No instructions provided."}</p>
        <p className="text-xs text-[var(--muted)]">
          Technician: {workOrder.assigned_technician_name ?? "—"} • Crew:{" "}
          {workOrder.assigned_crew_name ?? "—"}
        </p>
      </section>

      <PhotoUploader onUpload={uploadPhoto} disabled={pending || isCompleted} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]" />

      <section className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Uploaded photos</h2>
        {attachments.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No photos attached yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)]"
              >
                <img
                  src={attachment.file_url}
                  alt={attachment.caption ?? attachment.file_name}
                  className="h-24 w-full object-cover"
                />
                <p className="truncate px-2 py-1 text-xs text-[var(--muted)]">
                  {attachment.caption ?? attachment.file_name}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <WorkOrderChecklistCard
          workOrderId={workOrder.id}
          items={checklistItems}
          onToggle={toggleChecklist}
          onItemsChange={() => router.refresh()}
          isPending={pending}
        />
        <WorkOrderPartsCard
          workOrderId={workOrder.id}
          partUsage={partUsage}
          onPartsChange={() => router.refresh()}
          inventoryItems={inventoryItems}
        />
      </div>

      <NotesTimeline
        workOrderId={workOrder.id}
        technicianId={workOrder.technician_id_for_actor}
        notes={workOrder.notesTimeline}
        events={workOrder.activityTimeline}
        onChanged={() => router.refresh()}
      />

      {completionOpen ? (
        <WorkOrderCompletionModal
          workOrderId={workOrder.id}
          workOrderTitle={workOrder.title}
          technicians={technicians}
          assignedTechnicianId={workOrder.assigned_technician_id}
          estimatedHours={workOrder.estimated_hours}
          onClose={() => setCompletionOpen(false)}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
