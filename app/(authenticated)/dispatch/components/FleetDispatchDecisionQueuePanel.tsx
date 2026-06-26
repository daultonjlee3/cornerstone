"use client";

import { ChevronRight } from "lucide-react";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetOperationalException,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import { FleetJobQueue } from "./FleetJobQueue";
import { formatCurrency } from "./fleet-dispatch-utils";

type FleetDispatchDecisionQueuePanelProps = {
  recommendations: FleetRecommendationInstance[];
  exceptions: FleetOperationalException[];
  jobs: FleetDispatchJob[];
  board: FleetDispatchBoardData;
  selectedJobId: string | null;
  activeRecommendationId: string | null;
  pending?: boolean;
  onSelectJob: (id: string | null) => void;
  onAssignToTruck: (jobId: string, truckId: string) => void;
  truckLanes: FleetDispatchBoardData["truckLanes"];
  onHighlightRecommendation: (rec: FleetRecommendationInstance | null) => void;
  onCollapse?: () => void;
};

function contributionForRec(rec: FleetRecommendationInstance): number {
  return rec.rationale.candidate_snapshots?.[0]?.estimated_contribution ?? 0;
}

export function FleetDispatchDecisionQueuePanel({
  recommendations,
  exceptions,
  jobs,
  board,
  selectedJobId,
  activeRecommendationId,
  pending,
  onSelectJob,
  onAssignToTruck,
  truckLanes,
  onHighlightRecommendation,
  onCollapse,
}: FleetDispatchDecisionQueuePanelProps) {
  const rankedRecs = [...recommendations].sort((a, b) => contributionForRec(b) - contributionForRec(a));
  const critical = exceptions.filter((e) => e.severity === "critical").slice(0, 4);
  const warnings = exceptions.filter((e) => e.severity === "warning").slice(0, 3);

  return (
    <aside id="fleet-decision-queue" className="dispatch-console__rail-panel dispatch-console__queue-panel">
      <div className="dispatch-console__rail-header">
        <div className="min-w-0 flex-1">
          <p className="dispatch-console__dock-eyebrow">Decision queue</p>
          <p className="dispatch-console__dock-title">
            {rankedRecs.length + jobs.length} pending
          </p>
          <p className="dispatch-console__dock-meta">Ranked by impact · inbox · exceptions</p>
        </div>
        {onCollapse ? (
          <button
            type="button"
            className="dispatch-console__rail-collapse"
            onClick={onCollapse}
            aria-label="Collapse decision queue"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="dispatch-console__rail-body dispatch-console__queue-body">
        {rankedRecs.length > 0 ? (
          <section className="dispatch-console__queue-section">
            <p className="dispatch-console__queue-section-title">AI recommendations</p>
            <ul className="dispatch-console__queue-rec-list">
              {rankedRecs.map((rec, index) => {
                const contribution = contributionForRec(rec);
                const active = activeRecommendationId === rec.id;
                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      className={`dispatch-console__queue-rec-item ${active ? "dispatch-console__queue-rec-item--active" : ""}`}
                      onMouseEnter={() => onHighlightRecommendation(rec)}
                      onMouseLeave={() => onHighlightRecommendation(null)}
                      onClick={() => onHighlightRecommendation(rec)}
                    >
                      <span className="dispatch-console__queue-rec-rank">{index + 1}</span>
                      <span className="dispatch-console__queue-rec-title">{rec.rationale.title}</span>
                      {contribution > 0 ? (
                        <span className="dispatch-console__queue-rec-value">+{formatCurrency(contribution)}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="dispatch-console__queue-section">
          <p className="dispatch-console__queue-section-title">Unassigned jobs</p>
          <FleetJobQueue
            layout="embedded"
            jobs={jobs}
            board={board}
            selectedJobId={selectedJobId}
            onSelectJob={onSelectJob}
            onAssignToTruck={onAssignToTruck}
            truckLanes={truckLanes}
            recommendations={recommendations}
            pending={pending}
          />
        </section>

        {(critical.length > 0 || warnings.length > 0) && (
          <section className="dispatch-console__queue-section dispatch-console__exceptions-panel">
            <p className="dispatch-console__queue-section-title">Exceptions</p>
            <ul className="dispatch-console__exceptions-list">
              {[...critical, ...warnings].map((ex) => (
                <li
                  key={ex.id}
                  className={`dispatch-console__exception-item dispatch-console__exception-item--${ex.severity}`}
                >
                  <span className="dispatch-console__exception-dot" aria-hidden />
                  <div className="min-w-0">
                    <p className="dispatch-console__exception-title">{ex.title}</p>
                    <p className="dispatch-console__exception-meta">{ex.recommendedAction}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
