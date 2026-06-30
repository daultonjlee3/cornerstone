"use client";

import { Check } from "lucide-react";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import {
  formatCurrency,
  formatTime,
  recommendationConfidence,
} from "./fleet-dispatch-utils";

type ConfidenceRingProps = {
  score: number;
  label?: string;
  tier?: "high" | "medium" | "low";
};

function ConfidenceRing({ score, label, tier = "medium" }: ConfidenceRingProps) {
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={`dispatch-console__confidence-ring dispatch-console__confidence-ring--${tier}`}
      aria-label={label ? `${pct}% — ${label}` : `${pct}%`}
    >
      <div className="dispatch-console__confidence-ring-graphic">
        <svg viewBox="0 0 72 72" aria-hidden>
          <circle
            cx="36"
            cy="36"
            r={radius}
            className="dispatch-console__confidence-ring-track"
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            className="dispatch-console__confidence-ring-progress"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="dispatch-console__confidence-ring-value">{pct}%</span>
      </div>
      {label ? (
        <span className="dispatch-console__confidence-ring-caption">
          <span className="dispatch-console__confidence-ring-caption-tier">{label}</span>
          <span className="dispatch-console__confidence-ring-caption-sub">Match score</span>
        </span>
      ) : null}
    </div>
  );
}

type FleetDispatchNextDecisionProps = {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
  active: boolean;
  pending?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onViewMap: () => void;
  onHighlight: (active: boolean) => void;
};

export function FleetDispatchNextDecision({
  recommendation,
  board,
  active,
  pending,
  onAccept,
  onDismiss,
  onViewMap,
  onHighlight,
}: FleetDispatchNextDecisionProps) {
  const topCandidate = recommendation.rationale.candidates?.[0];
  const topSnapshot = recommendation.rationale.candidate_snapshots?.[0];
  const trust = recommendation.trust;
  const snapshots = recommendation.rationale.candidate_snapshots ?? [];
  const alternatives = trust?.alternativeOptions.length
    ? trust.alternativeOptions.map((alt) => ({
        truck_id: alt.truck_id,
        unit_number: alt.unit_number,
        score: alt.score,
        summary: alt.summary,
      }))
    : (recommendation.rationale.candidates ?? []).slice(1, 4).map((alt) => ({
        truck_id: alt.truck_id,
        unit_number: alt.unit_number,
        score: alt.score,
        summary: null as string | null,
      }));
  const confidence = trust?.confidenceLabel ?? recommendationConfidence(recommendation);
  const rankingScore = Math.round(trust?.confidenceScore ?? Number(topCandidate?.score ?? recommendation.score ?? 0));
  const ringScore = rankingScore;
  const jobId = recommendation.rationale.entities.job_id;
  const job = jobId ? board.jobs.find((item) => item.id === jobId) : null;
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";

  return (
    <div
      className={`dispatch-console__next-decision ${active ? "dispatch-console__next-decision--active" : ""}`}
      onMouseEnter={() => onHighlight(true)}
      onMouseLeave={() => onHighlight(false)}
    >
      <p className="dispatch-console__next-decision-eyebrow">Next decision</p>
      <h2 className="dispatch-console__next-decision-title">{recommendation.rationale.title}</h2>

      <div className="dispatch-console__next-decision-hero">
        {topSnapshot || trust ? (
          <div className="dispatch-console__next-decision-contribution">
            <span className="dispatch-console__next-decision-contribution-label">Expected contribution</span>
            <span className="dispatch-console__next-decision-contribution-value">
              +
              {formatCurrency(
                trust?.estimatedContributionImprovement ??
                  trust?.financialImpact ??
                  topSnapshot?.estimated_contribution ??
                  0
              )}
            </span>
          </div>
        ) : null}
        <ConfidenceRing
          score={ringScore}
          tier={confidence}
          label={
            confidence === "high" ? "High" : confidence === "medium" ? "Medium" : "Low"
          }
        />
      </div>

      {topSnapshot ? (
        <div className="dispatch-console__next-decision-metrics">
          {topSnapshot.deadhead_miles != null ? (
            <div className="dispatch-console__next-decision-metric">
              <span className="dispatch-console__next-decision-metric-label">Deadhead</span>
              <span className="dispatch-console__next-decision-metric-value">
                {topSnapshot.deadhead_miles.toFixed(1)} mi
              </span>
            </div>
          ) : null}
          {topSnapshot.travel_minutes != null ? (
            <div className="dispatch-console__next-decision-metric">
              <span className="dispatch-console__next-decision-metric-label">Drive time</span>
              <span className="dispatch-console__next-decision-metric-value">
                {Math.round(topSnapshot.travel_minutes)} min
              </span>
            </div>
          ) : null}
          {job?.scheduled_start ? (
            <div className="dispatch-console__next-decision-metric">
              <span className="dispatch-console__next-decision-metric-label">SLA window</span>
              <span className="dispatch-console__next-decision-metric-value">
                {formatTime(job.scheduled_start)}
                {job.scheduled_end ? ` – ${formatTime(job.scheduled_end)}` : ""}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {(trust?.whyThisRecommendation.length ?? 0) > 0 ||
      recommendation.rationale.reasons.length > 0 ? (
        <div className="dispatch-console__next-decision-reasons">
          <p className="dispatch-console__next-decision-section-title">Why this is the best option</p>
          <ul>
            {(trust?.whyThisRecommendation ?? recommendation.rationale.reasons)
              .slice(0, 4)
              .map((reason) => (
              <li key={reason}>
                <Check className="size-3.5 shrink-0" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {alternatives.length > 0 ? (
        <div className="dispatch-console__next-decision-alts">
          <p className="dispatch-console__next-decision-section-title">Alternatives considered</p>
          <table>
            <thead>
              <tr>
                <th>Truck</th>
                <th>Score</th>
                <th>Trade-off</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => {
                const snap = snapshots.find((s) => s.truck_id === alt.truck_id);
                const tradeoff =
                  alt.summary ??
                  (snap && snap.projected_overtime_cost > 0
                    ? "Overtime risk"
                    : snap && !snap.truck_type_match
                      ? "Wrong equipment"
                      : "Lower score");
                return (
                  <tr key={alt.truck_id}>
                    <td>{alt.unit_number}</td>
                    <td>{alt.score.toFixed(0)}</td>
                    <td>{tradeoff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="dispatch-console__next-decision-actions">
        <button
          type="button"
          className="dispatch-console__next-decision-accept"
          disabled={pending}
          onClick={onAccept}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept recommendation"}
        </button>
        <div className="dispatch-console__next-decision-secondary">
          <button type="button" className="dispatch-console__next-decision-secondary-btn" onClick={onViewMap}>
            View on map
          </button>
          <button
            type="button"
            className="dispatch-console__next-decision-secondary-btn dispatch-console__next-decision-secondary-btn--danger"
            disabled={pending}
            onClick={onDismiss}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
