"use client";

import { useState } from "react";
import { ArrowRight, ChevronRight, Clock, MapPin, Sparkles, TrendingUp, Truck } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import {
  confidenceLabel,
  formatRecommendationType,
} from "../../operations/components/fleet-recommendation-utils";
import {
  confidenceTone,
  recommendationConfidence,
} from "./fleet-dispatch-utils";
import { FleetDispatchRecommendationCard } from "./FleetDispatchRecommendationCard";

type FleetDispatchRecommendationsPanelProps = {
  layout?: "panel" | "float" | "cockpit";
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
  onCollapse?: () => void;
};

export function FleetDispatchRecommendationsPanel({
  layout = "panel",
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
  onCollapse,
}: FleetDispatchRecommendationsPanelProps) {
  const isDock = layout === "float" || layout === "cockpit";
  const [heroRec, ...moreRecs] = recommendations;
  const topSnapshot = heroRec?.rationale.candidate_snapshots?.[0];
  const topCandidate = heroRec?.rationale.candidates?.[0];
  const isCapacityOnly = heroRec?.recommendation_type === "capacity_overload";
  const [moreOpen, setMoreOpen] = useState(false);
  const heroConfidence = heroRec ? recommendationConfidence(heroRec) : null;
  const confidenceScore = topCandidate?.score ?? 0;

  const shellClass = isDock
    ? "dispatch-console__rail-panel"
    : "dispatch-mission__panel dispatch-mission__panel--intel";

  if (isDock) {
    return (
      <section id="fleet-recommendations" className={shellClass}>
        <div className="dispatch-console__rail-header">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="dispatch-console__dock-eyebrow dispatch-console__dock-eyebrow--accent">
                AI recommendation center
              </p>
              <p className="dispatch-console__dock-title">
                {recommendations.length === 0 ? "Monitoring fleet" : "Highest impact"}
              </p>
              <p className="dispatch-console__dock-meta">Why · confidence · assign</p>
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
                  aria-label="Collapse recommendations"
                  title="Collapse recommendations"
                >
                  <ChevronRight className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="dispatch-console__rail-body">
          {error ? <p className="mb-2 text-xs text-[var(--status-danger)]">{error}</p> : null}

          {!heroRec ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium">Fleet is stable</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">AI will surface actions when conditions shift</p>
            </div>
          ) : (
            <div
              className={`dispatch-console__rec-hero ${activeRecommendationId === heroRec.id ? "dispatch-console__rec-hero--active" : ""}`}
              onMouseEnter={() => onHighlight(heroRec)}
              onMouseLeave={() => onHighlight(null)}
            >
              <div className="dispatch-console__rec-hero-header">
                <div className="dispatch-console__rec-hero-badge">
                  <Sparkles className="size-3.5" aria-hidden />
                  <span>Top decision</span>
                </div>
                <span className={`dispatch-mission__confidence-pill ${heroConfidence ? confidenceTone(heroConfidence) : ""}`}>
                  {heroConfidence ? confidenceLabel(heroConfidence) : "—"}
                </span>
              </div>

              {heroConfidence ? (
                <div className="dispatch-console__rec-confidence" aria-hidden>
                  <div
                    className="dispatch-console__rec-confidence-fill"
                    style={{ width: `${Math.min(100, Math.max(12, confidenceScore))}%` }}
                  />
                </div>
              ) : null}

              <p className="dispatch-console__rec-hero-title">{heroRec.rationale.title}</p>
              <p className="dispatch-console__rec-hero-type">
                {formatRecommendationType(heroRec.recommendation_type)}
              </p>

              {topCandidate ? (
                <div className="dispatch-console__rec-truck-row">
                  <Truck className="size-4" aria-hidden />
                  <span className="dispatch-console__rec-truck-unit">{topCandidate.unit_number}</span>
                  <span className="dispatch-console__rec-truck-score">Score {topCandidate.score.toFixed(0)}</span>
                </div>
              ) : null}

              {topSnapshot ? (
                <p className="dispatch-console__rec-hero-impact">
                  {topSnapshot.estimated_contribution.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                  <span className="dispatch-console__rec-hero-impact-label">expected contribution</span>
                </p>
              ) : null}

              {topSnapshot ? (
                <div className="dispatch-console__rec-metrics">
                  {topSnapshot.revenue_impact > 0 ? (
                    <div className="dispatch-console__rec-metric">
                      <TrendingUp className="size-3 opacity-50" aria-hidden />
                      <span className="dispatch-console__rec-metric-label">Revenue</span>
                      <span className="dispatch-console__rec-metric-value">
                        {topSnapshot.revenue_impact.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ) : null}
                  {topSnapshot.deadhead_miles != null ? (
                    <div className="dispatch-console__rec-metric">
                      <MapPin className="size-3 opacity-50" aria-hidden />
                      <span className="dispatch-console__rec-metric-label">Deadhead</span>
                      <span className="dispatch-console__rec-metric-value">
                        {topSnapshot.deadhead_miles.toFixed(1)} mi
                      </span>
                    </div>
                  ) : null}
                  {topSnapshot.travel_minutes != null ? (
                    <div className="dispatch-console__rec-metric">
                      <Clock className="size-3 opacity-50" aria-hidden />
                      <span className="dispatch-console__rec-metric-label">Travel</span>
                      <span className="dispatch-console__rec-metric-value">
                        {Math.round(topSnapshot.travel_minutes)} min
                      </span>
                    </div>
                  ) : null}
                  <div className="dispatch-console__rec-metric">
                    <span className="dispatch-console__rec-metric-label">Utilization</span>
                    <span className="dispatch-console__rec-metric-value">
                      {Math.round(topSnapshot.projected_utilization_pct)}%
                    </span>
                  </div>
                </div>
              ) : null}

              {heroRec.rationale.reasons[0] ? (
                <p className="dispatch-console__rec-reasoning">{heroRec.rationale.reasons[0]}</p>
              ) : null}

              <Button
                type="button"
                className="dispatch-console__rec-hero-cta"
                disabled={pending}
                onClick={() => onAccept(heroRec.id)}
              >
                {isCapacityOnly ? "Acknowledge" : "Review & Assign"}
                {!isCapacityOnly ? <ArrowRight className="ml-2 size-4" /> : null}
              </Button>

              <div className="dispatch-console__rec-hero-actions">
                <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" disabled={pending} onClick={() => onDismiss(heroRec.id)}>
                  Dismiss
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => onViewMap(heroRec)}>
                  View on map
                </Button>
              </div>
            </div>
          )}

          {moreRecs.length > 0 ? (
            <details className="dispatch-console__rec-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
              <summary>{moreRecs.length} more recommendation{moreRecs.length === 1 ? "" : "s"}</summary>
              {moreRecs.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  className={`dispatch-console__rec-compact w-full text-left ${activeRecommendationId === rec.id ? "dispatch-console__rec-compact--active" : ""}`}
                  onMouseEnter={() => onHighlight(rec)}
                  onMouseLeave={() => onHighlight(null)}
                  onClick={() => onHighlight(rec)}
                >
                  {rec.rationale.title}
                </button>
              ))}
            </details>
          ) : null}
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
