"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import { AnimatedMetric } from "./AnimatedMetric";
import { formatCurrency, recommendationConfidence } from "./fleet-dispatch-utils";
import { confidenceLabel } from "../../operations/components/fleet-recommendation-utils";
import { FleetDispatchExceptionsStrip } from "./FleetDispatchExceptionsStrip";

type FleetDispatchMissionBriefingProps = {
  board: FleetDispatchBoardData;
  intel: FleetTodayViewData;
  recommendationCount: number;
  recommendations: FleetTodayViewData["recommendations"]["pending"];
  selectedDate: string;
  displayDate: string;
  pending?: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function FleetDispatchMissionBriefing({
  board,
  intel,
  recommendationCount,
  recommendations,
  selectedDate,
  displayDate,
  pending,
  onPrevDay,
  onNextDay,
  onDateChange,
  onRefresh,
}: FleetDispatchMissionBriefingProps) {
  const [showExceptions, setShowExceptions] = useState(false);

  const availableTrucks = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.jobs.length === 0
  ).length;
  const revenueAtRisk = intel.revenueAtRisk;
  const jobsWaiting = board.unassignedJobs.length;
  const criticalCount = intel.exceptions.filter((e) => e.severity === "critical").length;
  const warningCount = intel.exceptions.filter((e) => e.severity === "warning").length;

  const topRec = recommendations[0];
  const aiConfidence = topRec ? recommendationConfidence(topRec) : null;

  return (
    <header className="dispatch-console__briefing" id="fleet-dispatch-hero">
      <div className="dispatch-console__briefing-top">
        <div className="dispatch-console__greeting-block">
          <p className="dispatch-console__greeting">Today&apos;s mission</p>
          <h1 className="dispatch-console__headline">{greeting()}. Here&apos;s your operation.</h1>
          <p className="dispatch-console__subhead">
            {displayDate} · {board.truckLanes.length} trucks · {board.jobs.length} jobs on board
          </p>
        </div>

        <div className="dispatch-console__briefing-controls">
          <div className="dispatch-console__date-nav">
            <Button type="button" variant="ghost" size="sm" aria-label="Previous day" onClick={onPrevDay}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="dispatch-console__date-label">{displayDate}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="sr-only"
              aria-label="Select operating date"
            />
            <Button type="button" variant="ghost" size="sm" aria-label="Next day" onClick={onNextDay}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onRefresh} disabled={pending}>
            <RefreshCw className={`mr-1.5 size-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="dispatch-console__mission-stats" data-testid="fleet-dispatch-kpi-strip">
        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">Revenue at risk</p>
          {revenueAtRisk > 0 ? (
            <AnimatedMetric
              value={revenueAtRisk}
              format={(n) => formatCurrency(n)}
              className="dispatch-console__stat-value dispatch-console__stat-value--hero dispatch-console__stat-value--danger"
            />
          ) : (
            <p className="dispatch-console__stat-value dispatch-console__stat-value--hero">Protected</p>
          )}
          <p className="dispatch-console__stat-hint">
            {jobsWaiting > 0 ? `${jobsWaiting} jobs need assignment` : "No exposure flagged"}
          </p>
        </div>

        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">Jobs waiting</p>
          <p
            className={`dispatch-console__stat-value ${jobsWaiting > 0 ? "dispatch-console__stat-value--warn" : ""}`}
          >
            {jobsWaiting}
          </p>
          <p className="dispatch-console__stat-hint">Dispatch inbox</p>
        </div>

        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">Available trucks</p>
          <p className="dispatch-console__stat-value dispatch-console__stat-value--teal">{availableTrucks}</p>
          <p className="dispatch-console__stat-hint">Ready now</p>
        </div>

        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">AI recommendations</p>
          <p
            className={`dispatch-console__stat-value ${recommendationCount > 0 ? "dispatch-console__stat-value--teal" : ""}`}
          >
            {recommendationCount}
          </p>
          <p className="dispatch-console__stat-hint">
            {recommendationCount > 0 ? "Action ready" : "Monitoring"}
          </p>
        </div>

        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">AI confidence</p>
          <p className="dispatch-console__stat-value">
            {aiConfidence ? confidenceLabel(aiConfidence) : "—"}
          </p>
          <p className="dispatch-console__stat-hint">Top recommendation</p>
        </div>

        <div className="dispatch-console__stat">
          <p className="dispatch-console__stat-label">Critical alerts</p>
          <p
            className={`dispatch-console__stat-value ${criticalCount > 0 ? "dispatch-console__stat-value--danger" : ""}`}
          >
            {criticalCount}
          </p>
          {(criticalCount > 0 || warningCount > 0) && (
            <button
              type="button"
              className="dispatch-console__alert-link"
              onClick={() => setShowExceptions((v) => !v)}
            >
              {warningCount > 0 ? `${warningCount} warnings` : "View details"}
            </button>
          )}
        </div>
      </div>

      {showExceptions ? (
        <div className="dispatch-console__exceptions-fold">
          <FleetDispatchExceptionsStrip exceptions={intel.exceptions} />
        </div>
      ) : null}
    </header>
  );
}
