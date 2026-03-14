"use client";

import { useState, useCallback } from "react";
import type { AssetTimelineEvent } from "@/src/lib/assets/intelligence-types";
import { TimelineEvent } from "./TimelineEvent";

type AssetTimelineProps = {
  events: AssetTimelineEvent[];
  assetId: string;
};

export function AssetTimeline({ events: initialEvents, assetId }: AssetTimelineProps) {
  const [events, setEvents] = useState<AssetTimelineEvent[]>(initialEvents);
  const [hasMore, setHasMore] = useState(initialEvents.length >= 20);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assets/${encodeURIComponent(assetId)}/timeline?limit=20&offset=${events.length}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        events?: AssetTimelineEvent[];
        hasMore?: boolean;
      };
      const next = data.events ?? [];
      setEvents((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoading(false);
    }
  }, [assetId, events.length, hasMore, loading]);

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Asset Timeline
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Maintenance history for this asset. Most recent first.
      </p>
      <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            No timeline events recorded yet.
          </p>
        ) : (
          events.map((event) => <TimelineEvent key={event.id} event={event} />)
        )}
      </div>
      {hasMore && events.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/40 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}
