"use client";

import { Clock3, DollarSign, Gauge, MapPin, Navigation, Route, Shield, Sparkles, Truck } from "lucide-react";
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

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-lg border bg-[var(--surface-default)]/74 p-3 shadow-[var(--elevation-1)] transition-all duration-150 ${
        active
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/25"
          : "border-[var(--surface-border-subtle)] hover:border-[var(--foreground)]/15"
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
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-2.5 py-2">
          <Truck className="size-4 text-[var(--accent)]" />
          <div>
            <p className="text-xs font-bold">{topCandidate.unit_number}</p>
            <p className="text-[10px] text-[var(--muted)]">
              Objectively best operational choice · score {topCandidate.score.toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}

      {topSnapshot ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <ImpactTag
            icon={DollarSign}
            label="Revenue impact"
            value={topSnapshot.estimated_contribution.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
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
        <ul className="mt-2 space-y-1">
          {topReasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-[10px] leading-snug text-[var(--text-muted-strong)]"
            >
              <Shield className="mt-0.5 size-3 shrink-0 text-[var(--brand-operational)]" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <details className="mt-2 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/50 px-2 py-1.5">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Why this truck
        </summary>
        <div className="pt-1.5">
          <FleetRecommendationExplainability recommendation={recommendation} board={board} />
        </div>
      </details>

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
    </motion.li>
  );
}

function ImpactTag({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-2 py-1">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-[var(--muted)]">
        <Icon className="size-3 text-[var(--brand-operational)]" />
        {label}
      </div>
      <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
    </div>
  );
}
