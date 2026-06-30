"use client";

import { Clock3, DollarSign, Gauge, MapPin, Navigation, Route, Sparkles, Truck, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconChip, AppIcon } from "@/src/components/design-system/icons";
import { motion } from "framer-motion";
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
  const trust = recommendation.trust;
  const confidence = trust?.confidenceLabel ?? recommendationConfidence(recommendation);
  const candidates = recommendation.rationale.candidates ?? [];
  const topCandidate = candidates[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";
  const jobId = recommendation.rationale.entities.job_id;
  const primaryTruckId =
    topCandidate?.truck_id ?? recommendation.rationale.entities.truck_id ?? null;
  const topSnapshot = recommendation.rationale.candidate_snapshots?.[0];
  const topReason = trust?.whyThisRecommendation[0] ?? recommendation.rationale.reasons[0];
  const primaryCta = isCapacityOnly ? "Acknowledge" : "Review & Assign";
  const financialImpact =
    trust?.financialImpact ??
    trust?.estimatedContributionImprovement ??
    topSnapshot?.estimated_contribution ??
    null;
  const revenueValue =
    financialImpact != null
      ? financialImpact.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })
      : null;

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
      <div className="dispatch-mission__rec-card-head">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <IconChip icon={Sparkles} variant="ai" size="sm" glow className="mt-0.5 shrink-0" label="AI recommendation" />
            <div className="min-w-0">
              <p className="dispatch-mission__rec-action">{recommendation.rationale.title}</p>
              <p className="dispatch-mission__rec-type">{formatRecommendationType(recommendation.recommendation_type)}</p>
            </div>
          </div>
        </div>
        <span className={`dispatch-mission__confidence-pill ${confidenceTone(confidence)}`}>
          {confidenceLabel(confidence)}
        </span>
      </div>

      {revenueValue ? (
        <div className="dispatch-mission__rec-hero-metric">
          <p className="dispatch-mission__rec-hero-label">Expected financial impact</p>
          <p className="dispatch-mission__rec-hero-value">{revenueValue}</p>
        </div>
      ) : null}

      {topCandidate ? (
        <div className="dispatch-mission__rec-truck">
          <Truck className="size-5 text-[var(--brand-operational)]" />
          <div>
            <p className="dispatch-mission__rec-truck-unit">{topCandidate.unit_number}</p>
            <p className="dispatch-mission__rec-truck-meta">
              Best operational choice · score {topCandidate.score.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}

      {topSnapshot || trust ? (
        <div className="dispatch-mission__impact-grid">
          <ImpactTag
            icon={Route}
            label="Deadhead"
            value={
              trust?.deadheadReductionMiles != null
                ? `−${trust.deadheadReductionMiles.toFixed(1)} mi`
                : topSnapshot?.deadhead_miles != null
                  ? `${topSnapshot.deadhead_miles.toFixed(1)} mi`
                  : "—"
            }
          />
          <ImpactTag
            icon={Clock3}
            label="Time saved"
            value={
              trust?.timeSavingsMinutes != null
                ? `${Math.round(trust.timeSavingsMinutes)} min`
                : topSnapshot?.travel_minutes != null
                  ? `${Math.round(topSnapshot.travel_minutes)} min`
                  : "—"
            }
          />
          <ImpactTag
            icon={Gauge}
            label="Utilization"
            value={`${Math.round(trust?.projectedUtilizationPct ?? topSnapshot?.projected_utilization_pct ?? 0)}%`}
          />
          <ImpactTag
            icon={DollarSign}
            label="Revenue"
            value={
              trust?.revenueProtected != null
                ? trust.revenueProtected.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })
                : revenueValue ?? "—"
            }
            accent
          />
        </div>
      ) : null}

      {trust?.risks[0] ? (
        <p className="dispatch-mission__rec-risk text-xs text-amber-800">{trust.risks[0]}</p>
      ) : null}

      {topReason ? (
        <p className="dispatch-mission__rec-reason">{topReason}</p>
      ) : null}

      <Button
        type="button"
        className="dispatch-mission__rec-cta"
        disabled={pending}
        onClick={() => onAccept(recommendation.id)}
      >
        {primaryCta}
        {!isCapacityOnly ? <AppIcon icon={ArrowRight} size="sm" intent="operational" className="ml-2" /> : null}
      </Button>

      <details className="dispatch-mission__rec-details">
        <summary>Why this truck</summary>
        <div className="pt-2">
          <FleetRecommendationExplainability recommendation={recommendation} board={board} />
        </div>
      </details>

      <div className="dispatch-mission__rec-actions">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          disabled={pending}
          onClick={() => onDismiss(recommendation.id)}
        >
          Dismiss
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onViewMap(recommendation)}>
          <AppIcon icon={MapPin} size="xs" intent="muted" className="mr-1" />
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
            <AppIcon icon={Navigation} size="xs" intent="muted" className="mr-1" />
            Truck
          </Button>
        ) : null}
        {jobId ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onHighlightJob(jobId)}>
            Job
          </Button>
        ) : null}
      </div>
    </motion.li>
  );
}

function ImpactTag({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`dispatch-mission__impact-cell ${accent ? "dispatch-mission__impact-cell--accent" : ""}`}>
      <div className="dispatch-mission__impact-label">
        <AppIcon icon={icon} size="xs" intent={accent ? "operational" : "muted"} />
        {label}
      </div>
      <p className={`dispatch-mission__impact-value ${accent ? "dispatch-mission__impact-value--accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
