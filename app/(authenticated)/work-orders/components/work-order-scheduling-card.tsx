"use client";

import { formatDate, formatDateTime } from "./detail-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnClass =
  "rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type WorkOrderSchedulingCardProps = {
  workOrder: Record<string, unknown>;
  onAssignTechnician: () => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value ?? "—"}</dd>
    </div>
  );
}

export function WorkOrderSchedulingCard({ workOrder, onAssignTechnician }: WorkOrderSchedulingCardProps) {
  const hasTechnician = !!(workOrder.technician_name as string);
  const scheduledStart = workOrder.scheduled_start ? formatDateTime(workOrder.scheduled_start as string) : null;
  const scheduledEnd = workOrder.scheduled_end ? formatDateTime(workOrder.scheduled_end as string) : null;
  const scheduledRange = [scheduledStart, scheduledEnd].filter(Boolean).join(" – ") || null;

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Scheduling & assignment</h2>
      <dl className="space-y-3 text-sm">
        <Row label="Scheduled date" value={formatDate(workOrder.scheduled_date as string)} />
        {scheduledRange && <Row label="Scheduled start – end" value={scheduledRange} />}
        <Row label="Due date" value={formatDate(workOrder.due_date as string)} />
        <Row label="Assigned technician" value={workOrder.technician_name as string} />
        <Row label="Assigned crew" value={workOrder.crew_name as string} />
        <Row label="Estimated hours" value={workOrder.estimated_hours != null ? String(workOrder.estimated_hours) : null} />
        <Row label="Actual hours" value={workOrder.actual_hours != null ? String(workOrder.actual_hours) : null} />
      </dl>
      {!hasTechnician && (
        <div className="mt-4">
          <button type="button" onClick={onAssignTechnician} className={btnClass}>
            Assign technician
          </button>
        </div>
      )}
    </div>
  );
}
