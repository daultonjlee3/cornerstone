import type { AssetTimelineEvent } from "@/src/lib/assets/intelligence-types";

type AssetTimelineProps = {
  events: AssetTimelineEvent[];
};

function eventToneClass(eventType: string): string {
  const normalized = eventType.toLowerCase();
  if (normalized.includes("health")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized.includes("pm")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized.includes("failure") || normalized.includes("critical"))
    return "border-red-200 bg-red-50 text-red-700";
  if (normalized.includes("part")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted-strong)]";
}

export function AssetTimeline({ events }: AssetTimelineProps) {
  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Asset Timeline
      </h2>
      <div className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No lifecycle events recorded yet.</p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className={`rounded-lg border p-3 text-sm ${eventToneClass(event.eventType)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{event.summary}</p>
                <p className="text-xs">
                  {new Date(event.eventAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide opacity-80">
                {event.eventType.replace(/_/g, " ")} · {event.source}
              </p>
              {event.details ? <p className="mt-2 text-sm">{event.details}</p> : null}
              <p className="mt-2 text-xs opacity-80">
                Technician: {event.technicianName ?? "—"} · Work Order:{" "}
                {event.workOrderNumber ?? event.workOrderId ?? "—"}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
