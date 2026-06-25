"use client";

import { Button } from "@/src/components/ui/button";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import { FleetDispatchRecommendationCard } from "./FleetDispatchRecommendationCard";

type FleetDispatchRecommendationsPanelProps = {
  recommendations: FleetRecommendationInstance[];
  board: FleetDispatchBoardData;
  activeRecommendationId: string | null;
  pending?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onHighlight: (rec: FleetRecommendationInstance | null) => void;
  onViewMap: (rec: FleetRecommendationInstance) => void;
  onHighlightTruck: (truckId: string | null) => void;
  onHighlightJob: (jobId: string | null) => void;
};

export function FleetDispatchRecommendationsPanel({
  recommendations,
  board,
  activeRecommendationId,
  pending,
  error,
  onRefresh,
  onAccept,
  onDismiss,
  onHighlight,
  onViewMap,
  onHighlightTruck,
  onHighlightJob,
}: FleetDispatchRecommendationsPanelProps) {
  const panelRecommendations = recommendations.slice(0, 6);

  return (
    <section
      id="fleet-recommendations"
      className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/92 p-3 shadow-[var(--elevation-1)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Cornerstone Recommendations
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {recommendations.length === 0
              ? "No pending actions"
              : `${recommendations.length} decision${recommendations.length === 1 ? "" : "s"} ready for dispatch`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-[10px]"
          onClick={onRefresh}
          disabled={pending}
        >
          Refresh
        </Button>
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {panelRecommendations.length === 0 ? (
        <div className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/65 px-3 py-2 text-xs text-[var(--muted)]">
          Queue is healthy. New recommendations appear as jobs, truck status, or capacity changes.
        </div>
      ) : (
        <ul className="space-y-2">
          {panelRecommendations.map((recommendation) => (
            <FleetDispatchRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              board={board}
              pending={pending}
              active={activeRecommendationId === recommendation.id}
              onAccept={onAccept}
              onDismiss={onDismiss}
              onHighlight={onHighlight}
              onViewMap={onViewMap}
              onHighlightTruck={onHighlightTruck}
              onHighlightJob={onHighlightJob}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
