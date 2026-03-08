"use client";

import { formatDateTime } from "./detail-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

type StatusHistoryEntry = { id: string; from_status: string | null; to_status: string; changed_at: string };

type WorkOrderStatusTimelineProps = {
  entries: StatusHistoryEntry[];
};

function formatStatus(s: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

export function WorkOrderStatusTimeline({ entries }: WorkOrderStatusTimelineProps) {
  const chronological = [...entries].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Status history</h2>
      {chronological.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No status changes yet.</p>
      ) : (
        <ul className="space-y-3 border-l-2 border-[var(--card-border)] pl-4">
          {chronological.map((entry) => (
            <li key={entry.id} className="relative -left-[21px] flex gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--accent)] bg-[var(--card)]" aria-hidden />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {formatStatus(entry.from_status)} → {formatStatus(entry.to_status)}
                </p>
                <p className="text-xs text-[var(--muted)]">{formatDateTime(entry.changed_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
