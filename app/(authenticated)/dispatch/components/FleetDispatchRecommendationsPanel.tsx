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
    <section id="fleet-recommendations" className="dispatch-mission__panel">
      <div className="dispatch-mission__panel-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cs-text-eyebrow text-[var(--brand-operational)]">Cornerstone Recommendations</p>
            <p className="cs-text-section-title mt-1">
              {recommendations.length === 0 ? "Monitoring" : `${recommendations.length} ready`}
            </p>
            <p className="cs-text-caption cs-text-muted mt-1">
              {recommendations.length === 0
                ? "New recommendations appear as fleet conditions change"
                : "Review impact, then assign with confidence"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 text-xs"
            onClick={onRefresh}
            disabled={pending}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="dispatch-mission__panel-body">
        {error ? <p className="mb-3 cs-text-caption text-[var(--status-danger)]">{error}</p> : null}

        {panelRecommendations.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/65 px-4 py-6 text-center">
            <p className="cs-text-body font-medium">Queue is healthy</p>
            <p className="cs-text-caption cs-text-muted mt-2">
              Recommendations surface when jobs, truck status, or capacity shift.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
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
      </div>
    </section>
  );
}
