"use client";

import { Sparkles, X } from "lucide-react";
import type { FleetDispatchJob, FleetRecommendationInstance } from "@/src/types/fleet";
import type { AssignmentAlternative } from "@/src/lib/fleet/dispatch/assignment-service";
import { Button } from "@/src/components/ui/button";
import {
  extractCustomer,
  extractJobType,
  formatCurrency,
  formatTime,
  operationalRiskMessage,
} from "../fleet-dispatch-utils";

type JobIntelPanelProps = {
  job: FleetDispatchJob;
  displayRecommendation: FleetRecommendationInstance | null;
  alternatives: AssignmentAlternative[];
  onClose: () => void;
  onAccept: () => void;
  onSelectTruck: (truckId: string) => void;
  onViewAlternatives: () => void;
  onReject: () => void;
  pending?: boolean;
};

export function JobIntelPanel({
  job,
  displayRecommendation,
  alternatives,
  onClose,
  onAccept,
  onSelectTruck,
  onViewAlternatives,
  onReject,
  pending,
}: JobIntelPanelProps) {
  const topTruck = displayRecommendation?.rationale.candidates?.[0];
  const topSnapshot = displayRecommendation?.rationale.candidate_snapshots?.[0];
  const risk = operationalRiskMessage(job);

  return (
    <aside className="opmap-intel-panel opmap-intel-panel--job" aria-label={`Job ${job.title}`}>
      <header className="opmap-intel-panel__header">
        <div>
          <p className="opmap-intel-panel__eyebrow">Unassigned job</p>
          <h2 className="opmap-intel-panel__title">{extractJobType(job.title)}</h2>
          <p className="opmap-intel-panel__meta">
            {extractCustomer(job.title, job.site_name)} · {job.branch_name ?? "Branch"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" aria-label="Close job panel" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="opmap-intel-panel__body">
        {risk ? <p className="opmap-intel-panel__risk">{risk}</p> : null}
        <div className="opmap-intel-panel__stat-grid">
          <div>
            <span className="opmap-intel-panel__stat-label">Revenue</span>
            <span className="opmap-intel-panel__stat-value">{formatCurrency(job.revenue_estimate)}</span>
          </div>
          {job.scheduled_start ? (
            <div>
              <span className="opmap-intel-panel__stat-label">Window</span>
              <span className="opmap-intel-panel__stat-value">{formatTime(job.scheduled_start)}</span>
            </div>
          ) : null}
        </div>

        {topTruck ? (
          <section className="opmap-intel-panel__section">
            <p className="opmap-intel-panel__section-title">
              <Sparkles className="size-3.5" aria-hidden />
              Best truck
            </p>
            <button
              type="button"
              className="opmap-intel-panel__rec-card opmap-intel-panel__rec-card--primary"
              onClick={() => onSelectTruck(topTruck.truck_id)}
            >
              <span className="opmap-intel-panel__rec-unit">{topTruck.unit_number}</span>
              <span className="opmap-intel-panel__rec-score">Score {Math.round(topTruck.score)}</span>
              {topSnapshot ? (
                <span className="opmap-intel-panel__rec-meta">
                  +{formatCurrency(topSnapshot.estimated_contribution)}
                  {topSnapshot.deadhead_miles != null
                    ? ` · ${topSnapshot.deadhead_miles.toFixed(1)} mi deadhead`
                    : ""}
                </span>
              ) : null}
            </button>
          </section>
        ) : null}

        {alternatives.length > 0 ? (
          <section className="opmap-intel-panel__section">
            <p className="opmap-intel-panel__section-title">Alternative trucks</p>
            <ul className="opmap-intel-panel__alt-list">
              {alternatives.slice(0, 3).map((alt) => (
                <li key={alt.truckId ?? alt.unitNumber}>
                  <button
                    type="button"
                    className="opmap-intel-panel__alt-row"
                    onClick={() => alt.truckId && onSelectTruck(alt.truckId)}
                  >
                    <span>{alt.unitNumber}</span>
                    <span>{Math.round(alt.score)}</span>
                    <span>{alt.explanation[0] ?? "Lower score"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {displayRecommendation?.rationale.reasons.length ? (
          <section className="opmap-intel-panel__section">
            <p className="opmap-intel-panel__section-title">Why this truck</p>
            <ul className="opmap-intel-panel__reasons">
              {displayRecommendation.rationale.reasons.slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="opmap-intel-panel__actions">
          <button
            type="button"
            className="opmap-intel-panel__accept"
            disabled={pending || !topTruck}
            onClick={onAccept}
          >
            Accept recommendation
          </button>
          <div className="opmap-intel-panel__secondary-actions">
            <button type="button" onClick={onViewAlternatives}>
              View alternatives
            </button>
            <button type="button" className="opmap-intel-panel__reject" onClick={onReject}>
              Reject
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
