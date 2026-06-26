"use client";

import { Clock3, DollarSign, Gauge, MapPin, Navigation, Route, Shield, Sparkles, Truck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
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
  const topSnapshot = recommendation.rationale.candidate_snapshots?.[0];
  const topReasons = recommendation.rationale.reasons.slice(0, 2);
  const primaryCta = isCapacityOnly ? "Acknowledge" : "Review & Assign";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`dispatch-mission__rec-card list-none ${active ? "dispatch-mission__rec-card--active" : ""}`}
      onMouseEnter={() => onHighlight(recommendation)}
      onMouseLeave={() => onHighlight(null)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-[var(--brand-operational)]" />
            <p className="cs-text-body line-clamp-2 font-semibold leading-snug">
              {recommendation.rationale.title}
            </p>
          </div>
          <p className="cs-text-micro cs-text-muted mt-1.5">
            {formatRecommendationType(recommendation.recommendation_type)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 cs-text-micro font-bold uppercase ${confidenceTone(confidence)}`}
        >
          {confidenceLabel(confidence)}
        </span>
      </div>

      {topCandidate ? (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
          <Truck className="size-5 text-[var(--brand-operational)]" />
          <div>
            <p className="cs-text-body font-bold">{topCandidate.unit_number}</p>
            <p className="cs-text-caption cs-text-muted">
              Objectively best operational choice · score {topCandidate.score.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}

      {topSnapshot ? (
        <div className="dispatch-mission__impact-grid mt-4">
          <ImpactTag
            icon={DollarSign}
            label="Revenue impact"
            value={topSnapshot.estimated_contribution.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
            accent
          />
          <ImpactTag
            icon={Route}
            label="Deadhead"
            value={topSnapshot.deadhead_miles != null ? `${topSnapshot.deadhead_miles.toFixed(1)} mi` : "—"}
          />
          <ImpactTag
            icon={Clock3}
            label="Travel time"
            value={topSnapshot.travel_minutes != null ? `${Math.round(topSnapshot.travel_minutes)} min` : "—"}
          />
          <ImpactTag
            icon={Gauge}
            label="Projected utilization"
            value={`${Math.round(topSnapshot.projected_utilization_pct)}%`}
          />
        </div>
      ) : null}

      {topReasons.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {topReasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 cs-text-caption cs-text-muted leading-snug"
            >
              <Shield className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-operational)]" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/60 px-3 py-2">
        <summary className="cursor-pointer cs-text-micro font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Why this truck
        </summary>
        <div className="pt-2">
          <FleetRecommendationExplainability recommendation={recommendation} board={board} />
        </div>
      </details>

      <div className="mt-5 space-y-2">
        <Button
          type="button"
          className="h-10 w-full justify-center text-sm font-semibold"
          disabled={pending}
          onClick={() => onAccept(recommendation.id)}
        >
          {primaryCta}
          {!isCapacityOnly ? <ArrowRight className="ml-1.5 size-4" /> : null}
        </Button>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            disabled={pending}
            onClick={() => onDismiss(recommendation.id)}
          >
            Dismiss
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => onViewMap(recommendation)}
          >
            <MapPin className="mr-1 size-3" />
            Map
          </Button>
          {primaryTruckId ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => onHighlightTruck(primaryTruckId)}
            >
              <Navigation className="mr-1 size-3" />
              Truck
            </Button>
          ) : null}
          {jobId ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => onHighlightJob(jobId)}
            >
              Job
            </Button>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

function ImpactTag({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="dispatch-mission__impact-cell">
      <div className="flex items-center gap-1.5 cs-text-micro cs-text-muted uppercase tracking-wide">
        <Icon className="size-3.5 text-[var(--brand-operational)]" />
        {label}
      </div>
      <p
        className={`dispatch-mission__impact-value ${accent ? "dispatch-mission__impact-value--accent" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
