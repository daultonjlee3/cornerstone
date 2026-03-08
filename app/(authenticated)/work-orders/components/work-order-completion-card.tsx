"use client";

import { formatDateTime } from "./detail-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnPrimary =
  "rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type WorkOrderCompletionCardProps = {
  workOrder: Record<string, unknown>;
  status: string;
  onCompleteClick: () => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value ?? "—"}</dd>
    </div>
  );
}

export function WorkOrderCompletionCard({ workOrder, status, onCompleteClick }: WorkOrderCompletionCardProps) {
  const isCompleted = status === "completed";
  const hasCompletionData = !!(workOrder.resolution_summary ?? workOrder.completed_at);

  if (!isCompleted || !hasCompletionData) {
    return (
      <div className={cardClass}>
        <h2 className={cardTitleClass}>Completion record</h2>
        {status !== "completed" && status !== "closed" ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              Complete this work order to record resolution, labor, and follow-up details.
            </p>
            <button type="button" onClick={onCompleteClick} className={`mt-4 ${btnPrimary}`}>
              Complete work order
            </button>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">No completion record yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardClass} border-emerald-500/20 bg-emerald-500/5`}>
      <h2 className={cardTitleClass}>Completion record</h2>
      <dl className="space-y-3 text-sm">
        <Row label="Completion date" value={formatDateTime(workOrder.completed_at as string)} />
        <Row label="Completed by" value={workOrder.completed_by_technician_name as string} />
        <Row label="Resolution summary" value={workOrder.resolution_summary as string} />
        {(workOrder.completion_notes as string) && (
          <Row label="Completion notes" value={workOrder.completion_notes as string} />
        )}
        {(workOrder.root_cause as string) && (
          <Row label="Root cause" value={workOrder.root_cause as string} />
        )}
        <Row
          label="Actual hours"
          value={workOrder.actual_hours != null ? String(workOrder.actual_hours) : null}
        />
        <Row
          label="Completion result"
          value={
            workOrder.completion_status
              ? String(workOrder.completion_status).replace(/_/g, " ")
              : null
          }
        />
        <Row label="Follow-up required" value={workOrder.follow_up_required ? "Yes" : "No"} />
        {(workOrder.customer_visible_summary as string) && (
          <Row label="Customer-visible summary" value={workOrder.customer_visible_summary as string} />
        )}
        {(workOrder.internal_completion_notes as string) && (
          <Row label="Internal completion notes" value={workOrder.internal_completion_notes as string} />
        )}
      </dl>
    </div>
  );
}
