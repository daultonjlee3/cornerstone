"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type {
  FleetDispatchBoardData,
  FleetRecommendationInstance,
  FleetRecommendationRecalculationNotice,
} from "@/src/types/fleet";
import { FleetDispatchNextDecision } from "./FleetDispatchNextDecision";
import { FleetDispatchRecommendationCard } from "./FleetDispatchRecommendationCard";
import { FleetDispatchRecalculationCard } from "./FleetDispatchRecalculationCard";

type FleetDispatchRecommendationsPanelProps = {
  layout?: "panel" | "float" | "cockpit";
  recommendations: FleetRecommendationInstance[];
  board: FleetDispatchBoardData;
  activeRecommendationId: string | null;
  pending?: boolean;
  recommendationsLoading?: boolean;
  recommendationsRefreshing?: boolean;
  error?: string | null;
  recalculationNotice?: FleetRecommendationRecalculationNotice | null;
  onRefresh: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onHighlight: (rec: FleetRecommendationInstance | null) => void;
  onViewMap: (rec: FleetRecommendationInstance) => void;
  onHighlightTruck: (truckId: string | null) => void;
  onHighlightJob: (jobId: string | null) => void;
  onCollapse?: () => void;
};

export function FleetDispatchRecommendationsPanel({
  layout = "panel",
  recommendations,
  board,
  activeRecommendationId,
  pending,
  recommendationsLoading,
  recommendationsRefreshing,
  error,
  recalculationNotice,
  onRefresh,
  onAccept,
  onDismiss,
  onHighlight,
  onViewMap,
  onHighlightTruck,
  onHighlightJob,
  onCollapse,
}: FleetDispatchRecommendationsPanelProps) {
  const isDock = layout === "float" || layout === "cockpit";
  const heroRec = recommendations[0];

  const shellClass = isDock
    ? "dispatch-console__rail-panel dispatch-console__decision-panel"
    : "dispatch-mission__panel dispatch-mission__panel--intel";

  if (isDock) {
    return (
      <section id="fleet-recommendations" className={shellClass}>
        <div className="dispatch-console__rail-header">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="dispatch-console__dock-eyebrow dispatch-console__dock-eyebrow--accent">
                Cornerstone AI
              </p>
              <p className="dispatch-console__dock-title">Command decision</p>
              <p className="dispatch-console__dock-meta">
                {recommendationsLoading
                  ? "Loading recommendations…"
                  : recommendationsRefreshing
                    ? "Refreshing recommendations…"
                    : "Highest-impact assignment"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onRefresh} disabled={pending}>
                Refresh
              </Button>
              {layout === "cockpit" && onCollapse ? (
                <button
                  type="button"
                  className="dispatch-console__rail-collapse"
                  onClick={onCollapse}
                  aria-label="Collapse next decision"
                >
                  <ChevronLeft className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="dispatch-console__rail-body">
          {recalculationNotice ? (
            <FleetDispatchRecalculationCard notice={recalculationNotice} />
          ) : null}
          {error ? <p className="mb-2 text-xs text-[var(--status-danger)]">{error}</p> : null}

          {!heroRec ? (
            <div className="dispatch-console__next-decision-empty">
              <p className="text-sm font-medium">Fleet is stable</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                AI will surface the next best decision when conditions shift
              </p>
            </div>
          ) : (
            <FleetDispatchNextDecision
              recommendation={heroRec}
              board={board}
              active={activeRecommendationId === heroRec.id}
              pending={pending}
              onAccept={() => onAccept(heroRec.id)}
              onDismiss={() => onDismiss(heroRec.id)}
              onViewMap={() => onViewMap(heroRec)}
              onHighlight={(on) => onHighlight(on ? heroRec : null)}
            />
          )}
        </div>
      </section>
    );
  }

  const panelRecommendations = recommendations.slice(0, 6);

  return (
    <section id="fleet-recommendations" className={shellClass}>
      <div className="dispatch-mission__panel-header dispatch-mission__panel-header--minimal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dispatch-mission__panel-eyebrow dispatch-mission__panel-eyebrow--accent">
              Cornerstone Recommendations
            </p>
            <div className="dispatch-mission__panel-title-row">
              <p className="dispatch-mission__panel-title">
                {recommendations.length === 0 ? "Monitoring" : `${recommendations.length} ready`}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="secondary" className="h-8 shrink-0 text-xs" onClick={onRefresh} disabled={pending}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="dispatch-mission__panel-body dispatch-mission__rec-list">
        {recalculationNotice ? (
          <div className="px-4 pt-4">
            <FleetDispatchRecalculationCard notice={recalculationNotice} />
          </div>
        ) : null}
        {error ? <p className="mb-3 cs-text-caption text-[var(--status-danger)]">{error}</p> : null}
        {panelRecommendations.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="cs-text-body font-medium">Queue is healthy</p>
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
