"use client";

import { useMemo } from "react";
import { SectionHeader } from "@/src/components/design-system";
import type { FleetRecommendationInstance } from "@/src/types/fleet";
import { useOperationsPaginatedList } from "./useOperationsPaginatedList";
import { OperationsScrollSection } from "./OperationsScrollSection";
import { CompactRecommendationRow } from "./operations-list-rows";

type OperationsRecommendationsListProps = {
  date: string;
  enabled: boolean;
  totalCount: number;
  pending: boolean;
  refreshKey: number;
  onAction: (id: string, action: "accept" | "dismiss") => void;
};

function RecommendationsSkeleton() {
  return (
    <ul className="space-y-3 p-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-border-subtle)]" />
      ))}
    </ul>
  );
}

export function OperationsRecommendationsList({
  date,
  enabled,
  totalCount,
  pending,
  refreshKey,
  onAction,
}: OperationsRecommendationsListProps) {
  const extraParams = useMemo(() => ({ skip: "1" }), []);
  const { items, totalCount: loadedTotal, hasMore, loading, initialLoading, error, refresh, sentinelRef } =
    useOperationsPaginatedList<FleetRecommendationInstance>({
      endpoint: "/api/fleet/operations/recommendations",
      date,
      pageSize: 10,
      enabled,
      resetKey: refreshKey,
      extraParams,
    });

  const displayTotal = loadedTotal > 0 ? loadedTotal : totalCount;
  if (displayTotal <= 0 && !initialLoading && !loading) return null;

  const description =
    displayTotal > 0
      ? `${displayTotal} additional decision${displayTotal === 1 ? "" : "s"} ready`
      : "Additional recommendations";

  return (
    <div className="space-y-4 xl:col-span-5">
      <SectionHeader title="More recommendations" description={description} />
      <OperationsScrollSection
        ariaLabel="More recommendations"
        hasMore={hasMore}
        loading={loading}
        initialLoading={initialLoading}
        error={error}
        onRetry={() => void refresh()}
        sentinelRef={sentinelRef}
        empty={
          !initialLoading && items.length === 0 ? (
            <p className="cs-text-body cs-text-muted py-4">No additional recommendations.</p>
          ) : undefined
        }
        skeleton={<RecommendationsSkeleton />}
      >
        <ul className="space-y-3 p-3">
          {items.map((rec) => (
            <li key={rec.id}>
              <CompactRecommendationRow recommendation={rec} pending={pending} onAction={onAction} />
            </li>
          ))}
        </ul>
      </OperationsScrollSection>
    </div>
  );
}
