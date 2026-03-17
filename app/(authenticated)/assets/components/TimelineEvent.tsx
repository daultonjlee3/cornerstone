import Link from "next/link";
import type { AssetTimelineEvent } from "@/src/lib/assets/intelligence-types";
import { TimelineEventIcon } from "./TimelineEventIcon";

type TimelineEventProps = {
  event: AssetTimelineEvent;
};

function eventRowClass(canonicalType?: string | null): string {
  const t = (canonicalType ?? "").toLowerCase();
  if (t.includes("work_order") && t.includes("completed"))
    return "border-l-emerald-500/60 bg-emerald-50/50";
  if (t.includes("pm")) return "border-l-[var(--accent)]/60 bg-[var(--accent-glow)]/20";
  if (t.includes("part")) return "border-l-amber-500/60 bg-amber-50/50";
  if (t.includes("note")) return "border-l-slate-400/60 bg-slate-50/50";
  if (t.includes("sub_asset") || t.includes("asset_updated"))
    return "border-l-blue-500/60 bg-blue-50/50";
  return "border-l-[var(--card-border)] bg-[var(--background)]/60";
}

export function TimelineEvent({ event }: TimelineEventProps) {
  const dateLabel = new Date(event.eventAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = new Date(event.eventAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article
      className={`flex gap-4 rounded-lg border border-[var(--card-border)] border-l-4 p-3 text-sm ${eventRowClass(event.canonicalType)}`}
    >
      <div className="flex shrink-0 flex-col text-right">
        <span className="text-xs font-medium text-[var(--foreground)]">{dateLabel}</span>
        <span className="text-[10px] text-[var(--muted)]">{timeLabel}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <TimelineEventIcon
            canonicalType={event.canonicalType ?? undefined}
            eventType={event.eventType}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--foreground)]">{event.summary}</p>
            {event.subAssetName ? (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Sub-asset: {event.subAssetName}
              </p>
            ) : null}
            {(event.workOrderNumber ?? event.workOrderId) && event.workOrderId ? (
              <p className="mt-1">
                <Link
                  href={`/work-orders/${event.workOrderId}`}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Work Order #{event.workOrderNumber ?? event.workOrderId.slice(0, 8)}
                </Link>
              </p>
            ) : null}
            {(event.technicianName || event.userName) && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {event.technicianName ? `Technician: ${event.technicianName}` : null}
                {event.technicianName && event.userName ? " · " : null}
                {event.userName ? `By ${event.userName}` : null}
              </p>
            )}
            {event.details ? (
              <p className="mt-1 text-xs text-[var(--muted)]">{event.details}</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
