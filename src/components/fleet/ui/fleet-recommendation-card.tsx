"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import type { FleetRecommendationInstance } from "@/src/types/fleet";
import { FleetPanel } from "@/src/components/fleet/ui/fleet-panel";
import { FleetStatusChip } from "@/src/components/fleet/ui/fleet-status-chip";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import { confidenceToFleetSeverity } from "@/src/lib/fleet/ui/severity";
import {
  confidenceLabel,
  factorLabel,
  formatRecommendationType,
  recommendationConfidence,
} from "@/app/(authenticated)/operations/components/fleet-recommendation-utils";

type FleetRecommendationCardProps = {
  recommendation: FleetRecommendationInstance;
  onAction: (id: string, action: "accept" | "dismiss") => void;
  pending: boolean;
  variant?: "hero" | "compact";
};

export function FleetRecommendationCard({
  recommendation,
  onAction,
  pending,
  variant = "compact",
}: FleetRecommendationCardProps) {
  const confidence = recommendationConfidence(recommendation);
  const factors = recommendation.rationale.factors;
  const candidates = recommendation.rationale.candidates ?? [];
  const snapshots = recommendation.rationale.candidate_snapshots ?? [];
  const topCandidate = candidates[0];
  const topSnapshot = snapshots[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";
  const isHero = variant === "hero";

  return (
    <FleetPanel
      variant={isHero ? "accent" : "elevated"}
      className={`p-5 ${isHero ? "lg:p-6" : "p-4"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {isHero ? (
            <p className="fleet-eyebrow">Recommended action</p>
          ) : null}
          <p className={`font-semibold text-[var(--foreground)] ${isHero ? "text-lg leading-snug" : "text-sm"}`}>
            {recommendation.rationale.title}
          </p>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {formatRecommendationType(recommendation.recommendation_type)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FleetStatusChip label={`Score ${recommendation.score.toFixed(0)}`} severity="info" showDot={false} />
          <FleetStatusChip
            label={confidenceLabel(confidence)}
            severity={confidenceToFleetSeverity(confidence)}
          />
        </div>
      </div>

      {topCandidate ? (
        <p className={`text-[var(--foreground)] ${isHero ? "mt-4 text-base" : "mt-2 text-sm"}`}>
          <span className="text-[var(--muted)]">Assign</span>{" "}
          <span className="font-semibold">Truck {topCandidate.unit_number}</span>
          {recommendation.rationale.entities.job_id ? (
            <>
              {" "}
              <span className="text-[var(--muted)]">→ Job</span>{" "}
              <span className="font-medium">{recommendation.rationale.entities.job_id.slice(0, 8)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {topSnapshot && isHero ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-control)] bg-[var(--card-solid)]/60 px-3 py-2">
            <p className="fleet-kpi-label">Est. contribution</p>
            <p className="mt-1 text-sm font-semibold text-[var(--success)]">
              {formatFleetCurrency(topSnapshot.estimated_contribution)}
            </p>
          </div>
          {topSnapshot.deadhead_miles != null ? (
            <div className="rounded-[var(--radius-control)] bg-[var(--card-solid)]/60 px-3 py-2">
              <p className="fleet-kpi-label">Est. deadhead</p>
              <p className="mt-1 text-sm font-semibold">{topSnapshot.deadhead_miles.toFixed(1)} mi</p>
            </div>
          ) : null}
          {topSnapshot.travel_minutes != null ? (
            <div className="rounded-[var(--radius-control)] bg-[var(--card-solid)]/60 px-3 py-2">
              <p className="fleet-kpi-label">Travel time</p>
              <p className="mt-1 text-sm font-semibold">{Math.round(topSnapshot.travel_minutes)} min</p>
            </div>
          ) : null}
          <div className="rounded-[var(--radius-control)] bg-[var(--card-solid)]/60 px-3 py-2">
            <p className="fleet-kpi-label">GPS freshness</p>
            <p className="mt-1 text-sm font-semibold">{topSnapshot.gps_label}</p>
          </div>
        </div>
      ) : null}

      <div className={isHero ? "mt-5" : "mt-3"}>
        <p className="fleet-kpi-label">Why this action</p>
        <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-[var(--muted-strong)]">
          {recommendation.rationale.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-[var(--accent)]">·</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {factors && isHero ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(factors) as Array<keyof typeof factors>).map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-[10px] text-[var(--muted)]">
                <span>{factorLabel(key)}</span>
                <span>{(factors[key] ?? 0).toFixed(0)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--background)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, factors[key] ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {candidates.length > 1 ? (
        <div className="mt-3">
          <p className="fleet-kpi-label">Why not alternatives</p>
          <ul className="mt-1 space-y-1 text-xs text-[var(--muted)]">
            {candidates.slice(1, 3).map((c) => (
              <li key={c.truck_id}>
                Truck {c.unit_number} — score {c.score.toFixed(0)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`flex flex-wrap gap-2 ${isHero ? "mt-6" : "mt-4"}`}>
        <Button
          type="button"
          size={isHero ? "md" : "sm"}
          onClick={() => onAction(recommendation.id, "accept")}
          disabled={pending}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept & apply"}
        </Button>
        <Button
          type="button"
          size={isHero ? "md" : "sm"}
          variant="secondary"
          onClick={() => onAction(recommendation.id, "dismiss")}
          disabled={pending}
        >
          Dismiss
        </Button>
        {!isCapacityOnly ? (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/dispatch">Open dispatch</Link>
          </Button>
        ) : null}
      </div>
    </FleetPanel>
  );
}
