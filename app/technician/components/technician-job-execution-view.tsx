"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateWorkOrderStatus,
  uploadWorkOrderPhoto,
  logWorkOrderLabor,
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
import type { AssetInsightSeverity } from "@/src/lib/assets/intelligence-types";
import type {
  TechnicianPortalAttachment,
  TechnicianPortalLaborEntry,
} from "./job-types";

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
  company_id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  source_type: string | null;
  due_date: string | null;
  description: string | null;
  instructions: string | null;
  safety_notes: string | null;
  assigned_crew_id: string | null;
  asset_name: string | null;
  asset_id: string | null;
  location: string | null;
  location_segments: string[];
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
  asset_context: {
    id: string | null;
    name: string | null;
    asset_type: string | null;
    health_score: number | null;
    failure_risk: number | null;
    last_maintenance_at: string | null;
    recurring_issues: Array<{
      id: string;
      pattern_type: string;
      frequency: number;
      severity: AssetInsightSeverity;
      recommendation: string;
    }>;
  };
  checklist_progress: {
    total: number;
    completed: number;
    percent: number;
    remaining: number;
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

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function defaultLocalDateTimeValue(offsetMinutes = 0): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  date.setSeconds(0, 0);
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function healthTone(score: number | null): string {
  if (score == null) return "bg-slate-100 text-slate-700";
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 70) return "bg-blue-100 text-blue-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  if (score >= 30) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function severityTone(severity: AssetInsightSeverity): string {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-700";
  if (severity === "high") return "border-orange-300 bg-orange-50 text-orange-700";
  if (severity === "medium") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-blue-300 bg-blue-50 text-blue-700";
}

function patternLabel(patternType: string): string {
  if (patternType.startsWith("recurring_failure:")) {
    return patternType.replace("recurring_failure:", "").replace(/_/g, " ");
  }
  return patternType.replace(/_/g, " ");
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
  const [enforceChecklistCompletion, setEnforceChecklistCompletion] = useState(true);
  const [noteFocusSignal, setNoteFocusSignal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [laborStart, setLaborStart] = useState(() => defaultLocalDateTimeValue(-60));
  const [laborEnd, setLaborEnd] = useState(() => defaultLocalDateTimeValue(0));
  const [laborHours, setLaborHours] = useState("");
  const [laborNotes, setLaborNotes] = useState("");
  const photoSectionRef = useRef<HTMLElement | null>(null);
  const noteSectionRef = useRef<HTMLElement | null>(null);

  const isCompleted = workOrder.status === "completed";
  const isInProgress = workOrder.status === "in_progress";
  const isOnHold = workOrder.status === "on_hold";
  const checklistProgress = workOrder.checklist_progress;
  const photoAttachments = attachments.filter((attachment) =>
    String(attachment.file_type ?? "").startsWith("image/")
  );

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

  const openCompletionFlow = () => {
    if (enforceChecklistCompletion && checklistProgress.remaining > 0) {
      setMessage({
        type: "error",
        text: `Complete all required checklist items before finishing this job (${checklistProgress.remaining} remaining).`,
      });
      return;
    }
    setCompletionOpen(true);
  };

  const submitLaborLog = () => {
    setMessage(null);
    if (!laborStart || !laborEnd) {
      setMessage({ type: "error", text: "Start and end time are required for labor logs." });
      return;
    }
    const startDate = new Date(laborStart);
    const endDate = new Date(laborEnd);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setMessage({ type: "error", text: "Labor start and end times are invalid." });
      return;
    }
    if (endDate <= startDate) {
      setMessage({ type: "error", text: "Labor end time must be after start time." });
      return;
    }
    const parsedHours = laborHours.trim() ? Number(laborHours) : null;
    if (parsedHours != null && (!Number.isFinite(parsedHours) || parsedHours <= 0)) {
      setMessage({ type: "error", text: "Labor hours must be greater than zero." });
      return;
    }

    startTransition(async () => {
      const result = await logWorkOrderLabor(workOrder.id, {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        labor_hours: parsedHours,
        notes: laborNotes.trim() || null,
        technician_id: workOrder.technician_id_for_actor,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Labor log added." });
      setLaborHours("");
      setLaborNotes("");
      setLaborStart(defaultLocalDateTimeValue(-60));
      setLaborEnd(defaultLocalDateTimeValue(0));
      router.refresh();
    });
  };

  const jumpToNotes = () => {
    setNoteFocusSignal((value) => value + 1);
    noteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const jumpToPhotos = () => {
    photoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4 pb-10">
      <header className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {workOrder.work_order_number ?? "Work order"}
        </p>
        <h1 className="text-xl font-semibold leading-tight text-[var(--foreground)]">
          {workOrder.title}
        </h1>
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
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <dt className="text-xs text-[var(--muted)]">Due date</dt>
            <dd className="font-medium text-[var(--foreground)]">{formatDateOnly(workOrder.due_date)}</dd>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <dt className="text-xs text-[var(--muted)]">Asset</dt>
            <dd className="font-medium text-[var(--foreground)]">{workOrder.asset_name ?? "Unassigned asset"}</dd>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <dt className="text-xs text-[var(--muted)]">Location</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {workOrder.location_segments.join(" → ") || "No location"}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <dt className="text-xs text-[var(--muted)]">Assigned</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {workOrder.assigned_technician_name ?? workOrder.assigned_crew_name ?? "Unassigned"}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2 sm:col-span-2">
            <dt className="text-xs text-[var(--muted)]">Estimated duration</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {workOrder.estimated_hours != null ? `${workOrder.estimated_hours}h` : "Not set"}
            </dd>
          </div>
        </dl>
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

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Labor tracking</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-[var(--muted)]">
            Start time
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={laborStart}
              onChange={(event) => setLaborStart(event.target.value)}
              disabled={pending || isCompleted}
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            End time
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={laborEnd}
              onChange={(event) => setLaborEnd(event.target.value)}
              disabled={pending || isCompleted}
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Labor hours (optional override)
            <input
              type="number"
              min="0"
              step="0.25"
              className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={laborHours}
              onChange={(event) => setLaborHours(event.target.value)}
              disabled={pending || isCompleted}
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Notes
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={laborNotes}
              onChange={(event) => setLaborNotes(event.target.value)}
              disabled={pending || isCompleted}
            />
          </label>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full text-sm sm:w-auto"
          onClick={submitLaborLog}
          disabled={pending || isCompleted}
        >
          Log Labor
        </Button>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Logged entries ({laborEntries.length})
          </p>
          {laborEntries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No labor entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {laborEntries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatDateTime(entry.started_at)} → {formatDateTime(entry.ended_at)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {(entry.duration_minutes != null
                      ? `${(entry.duration_minutes / 60).toFixed(2)}`
                      : "0.00")}{" "}
                    hours
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 text-xs text-[var(--muted-strong)]">{entry.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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

      <section className="sticky bottom-20 z-20 rounded-xl border border-[var(--card-border)] bg-[var(--card)]/95 p-2 shadow-[var(--shadow-soft)] backdrop-blur sm:bottom-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {!isCompleted && !isInProgress ? (
            <Button
              type="button"
              className="h-11 text-sm"
              onClick={() => runStatusUpdate("in_progress")}
              disabled={pending}
            >
              {isOnHold ? "Resume" : "Start Job"}
            </Button>
          ) : !isCompleted ? (
            <Button
              type="button"
              variant="secondary"
              className="h-11 text-sm"
              onClick={() => runStatusUpdate("on_hold")}
              disabled={pending}
            >
              Pause Job
            </Button>
          ) : (
            <Button type="button" variant="secondary" className="h-11 text-sm" disabled>
              Complete
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="h-11 text-sm"
            onClick={jumpToNotes}
            disabled={pending}
          >
            Add Note
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 text-sm"
            onClick={jumpToPhotos}
            disabled={pending}
          >
            Add Photo
          </Button>
          {!isCompleted ? (
            <Button
              type="button"
              variant="secondary"
              className="h-11 text-sm col-span-2 sm:col-span-2"
              onClick={openCompletionFlow}
              disabled={pending}
            >
              Complete Job
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Asset Context</h2>
          {workOrder.asset_id ? (
            <Link href={`/assets/${workOrder.asset_id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
              Open asset history
            </Link>
          ) : null}
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <p className="text-xs text-[var(--muted)]">Asset</p>
            <p className="font-medium text-[var(--foreground)]">{workOrder.asset_context.name ?? "No asset linked"}</p>
            <p className="text-xs text-[var(--muted)]">{workOrder.asset_context.asset_type ?? "Type not set"}</p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2">
            <p className="text-xs text-[var(--muted)]">Health score</p>
            <p className={`inline-flex rounded-full px-2 py-0.5 text-sm font-semibold ${healthTone(workOrder.asset_context.health_score)}`}>
              {workOrder.asset_context.health_score != null
                ? `${Number(workOrder.asset_context.health_score).toFixed(0)}`
                : "—"}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Failure risk:{" "}
              {workOrder.asset_context.failure_risk != null
                ? `${Number(workOrder.asset_context.failure_risk).toFixed(0)} / 100`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-2 sm:col-span-2">
            <p className="text-xs text-[var(--muted)]">Last maintenance</p>
            <p className="font-medium text-[var(--foreground)]">
              {formatDateTime(workOrder.asset_context.last_maintenance_at)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Recurring issues</p>
          {workOrder.asset_context.recurring_issues.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">No recurring issues detected.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {workOrder.asset_context.recurring_issues.map((issue) => (
                <li key={issue.id} className={`rounded-lg border p-2 text-xs ${severityTone(issue.severity)}`}>
                  <p className="font-semibold">
                    {patternLabel(issue.pattern_type)} • {issue.frequency} occurrence(s)
                  </p>
                  <p>{issue.recommendation}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Work Instructions</h2>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Problem description</p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            {workOrder.description ?? "No problem description provided."}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted-strong)]">
            {workOrder.instructions ?? "No specific instructions provided."}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Safety notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted-strong)]">
            {workOrder.safety_notes ?? "No safety notes recorded."}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Attachments ({attachments.length})
          </p>
          {attachments.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">No instruction attachments uploaded.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    {attachment.caption ?? attachment.file_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Checklist Progress</h2>
          <span className="text-xs font-medium text-[var(--muted)]">
            {checklistProgress.completed}/{checklistProgress.total} complete
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${checklistProgress.percent}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          {checklistProgress.remaining > 0
            ? `${checklistProgress.remaining} item(s) remaining.`
            : "Checklist complete."}
        </p>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={enforceChecklistCompletion}
            onChange={(event) => setEnforceChecklistCompletion(event.target.checked)}
            className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          Require checklist completion before job completion
        </label>
      </section>

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
            onClick={openCompletionFlow}
            disabled={pending}
          >
            Complete Work Order
          </Button>
        ) : null}
      </section>

      <section
        ref={photoSectionRef}
        id="technician-photo-upload-section"
        className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]"
      >
        <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Photo Capture</h2>
        <PhotoUploader
          onUpload={uploadPhoto}
          disabled={pending || isCompleted}
        />
      </section>

      <section className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Uploaded photos</h2>
        {photoAttachments.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No photos attached yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photoAttachments.map((attachment) => (
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

      <section ref={noteSectionRef} id="technician-notes-section">
        <NotesTimeline
          workOrderId={workOrder.id}
          technicianId={workOrder.technician_id_for_actor}
          notes={workOrder.notesTimeline}
          events={workOrder.activityTimeline}
          onChanged={() => router.refresh()}
          composerId="technician-note-input"
          focusSignal={noteFocusSignal}
        />
      </section>

      {completionOpen ? (
        <WorkOrderCompletionModal
          workOrderId={workOrder.id}
          workOrderTitle={workOrder.title}
          technicians={technicians}
          assignedTechnicianId={workOrder.assigned_technician_id}
          estimatedHours={workOrder.estimated_hours}
          inventoryItems={inventoryItems}
          technicianIdForUpload={workOrder.technician_id_for_actor}
          enforceChecklistCompletion={enforceChecklistCompletion}
          onClose={() => setCompletionOpen(false)}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
