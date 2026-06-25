"use client";

import { MapPin, Navigation, Sparkles, Truck } from "lucide-react";
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
import { FleetRecommendationExplainability } from "./FleetRecommendationExplainability";

type FleetDispatchRecommendationCardProps = {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
  pending?: boolean;
  active?: boolean;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onHighlight: (rec: FleetRecommendationInstance | null) => void;
  onViewMap: (rec: FleetRecommendationInstance) => void;
  onHighlightTruck: (truckId: string | null) => void;
  onHighlightJob: (jobId: string | null) => void;
};

export function FleetDispatchRecommendationCard({
  recommendation,
  board,
  pending,
  active,
  onAccept,
  onDismiss,
  onHighlight,
  onViewMap,
  onHighlightTruck,
  onHighlightJob,
}: FleetDispatchRecommendationCardProps) {
  const confidence = recommendationConfidence(recommendation);
  const candidates = recommendation.rationale.candidates ?? [];
  const topCandidate = candidates[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";
  const jobId = recommendation.rationale.entities.job_id;
  const primaryTruckId =
    topCandidate?.truck_id ?? recommendation.rationale.entities.truck_id ?? null;

  return (
    <li
      className={`rounded-lg border bg-white p-3 shadow-sm transition-all duration-150 dark:bg-[var(--card)] ${
        active
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/25"
          : "border-[var(--card-border)] hover:border-[var(--foreground)]/15"
      }`}
      onMouseEnter={() => onHighlight(recommendation)}
      onMouseLeave={() => onHighlight(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0 text-[var(--accent)]" />
            <p className="line-clamp-2 text-xs font-bold leading-snug">{recommendation.rationale.title}</p>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {formatRecommendationType(recommendation.recommendation_type)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${confidenceTone(confidence)}`}
        >
          {confidenceLabel(confidence)}
        </span>
      </div>

      {topCandidate ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white px-2.5 py-2 dark:bg-[var(--card)]">
          <Truck className="size-4 text-[var(--accent)]" />
          <div>
            <p className="text-xs font-bold">{topCandidate.unit_number}</p>
            <p className="text-[10px] text-[var(--muted)]">
              Objectively best operational choice · score {topCandidate.score.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}

      <FleetRecommendationExplainability recommendation={recommendation} board={board} />

      <div className="mt-3 flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          className="h-7 text-[10px]"
          disabled={pending}
          onClick={() => onAccept(recommendation.id)}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-[10px]"
          disabled={pending}
          onClick={() => onDismiss(recommendation.id)}
        >
          Dismiss
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => onViewMap(recommendation)}>
          <MapPin className="mr-1 size-3" />
          Map
        </Button>
        {primaryTruckId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[10px]"
            onClick={() => onHighlightTruck(primaryTruckId)}
          >
            <Navigation className="mr-1 size-3" />
            Truck
          </Button>
        ) : null}
        {jobId ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => onHighlightJob(jobId)}>
            Job
          </Button>
        ) : null}
      </div>
    </li>
  );
}
