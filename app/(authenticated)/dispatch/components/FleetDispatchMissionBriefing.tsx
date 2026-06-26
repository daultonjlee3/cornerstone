"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import { AnimatedMetric } from "./AnimatedMetric";
import { formatCurrency, sumRecommendationContribution } from "./fleet-dispatch-utils";

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
  const [lastRefresh] = useState(() =>
    new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );

  const availableTrucks = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.jobs.length === 0
  ).length;
  const revenueAtRisk = intel.revenueAtRisk;
  const jobsScheduled = board.jobs.length;

  const aiOpportunity = useMemo(() => {
    const fromRecs = sumRecommendationContribution(recommendations);
    if (fromRecs > 0) return fromRecs;
    const fromIntel =
      intel.commandCenter.recommendationOpportunity ??
      intel.executiveInsights?.largestRecommendationOpportunity ??
      0;
    return fromIntel > 100 ? fromIntel : 0;
  }, [intel, recommendations]);

  return (
    <header className="dispatch-console__briefing" id="fleet-dispatch-hero">
      <div className="dispatch-console__briefing-top">
        <div className="dispatch-console__greeting-block">
          <p className="dispatch-console__greeting">Cornerstone Fleet Intelligence</p>
          <h1 className="dispatch-console__headline">Command Center</h1>
          <p className="dispatch-console__subhead">
            {displayDate} · {board.truckLanes.length} trucks · live dispatch intelligence
          </p>
        </div>

        <div className="dispatch-console__briefing-controls">
          <div className="dispatch-console__search" role="search">
            <Search className="size-3.5 opacity-50" aria-hidden />
            <input
              type="search"
              placeholder="Search jobs, trucks, branches…"
              className="dispatch-console__search-input"
              aria-label="Search dispatch"
            />
            <kbd className="dispatch-console__search-kbd">⌘K</kbd>
          </div>
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
          <span className="dispatch-console__refresh-time">Updated {lastRefresh}</span>
        </div>
      </div>

      <div className="dispatch-console__kpi-row" data-testid="fleet-dispatch-kpi-strip">
        <div className="dispatch-console__kpi-card">
          <p className="dispatch-console__kpi-label">Jobs scheduled</p>
          <p className="dispatch-console__kpi-value">{jobsScheduled}</p>
          <p className="dispatch-console__kpi-hint">{board.unassignedJobs.length} unassigned</p>
        </div>

        <div className="dispatch-console__kpi-card">
          <p className="dispatch-console__kpi-label">Trucks available</p>
          <p className="dispatch-console__kpi-value dispatch-console__kpi-value--teal">{availableTrucks}</p>
          <p className="dispatch-console__kpi-hint">Ready for dispatch</p>
        </div>

        <div className="dispatch-console__kpi-card dispatch-console__kpi-card--risk">
          <p className="dispatch-console__kpi-label">Revenue at risk</p>
          {revenueAtRisk > 0 ? (
            <AnimatedMetric
              value={revenueAtRisk}
              format={(n) => formatCurrency(n)}
              className="dispatch-console__kpi-value dispatch-console__kpi-value--danger"
            />
          ) : (
            <p className="dispatch-console__kpi-value">Protected</p>
          )}
          <p className="dispatch-console__kpi-hint">
            {revenueAtRisk > 0 ? "Needs attention" : "No exposure flagged"}
          </p>
        </div>

        <div className="dispatch-console__kpi-card dispatch-console__kpi-card--opportunity">
          <p className="dispatch-console__kpi-label">AI opportunity</p>
          <p className="dispatch-console__kpi-value dispatch-console__kpi-value--gain">
            {aiOpportunity > 0 ? formatCurrency(aiOpportunity) : "—"}
          </p>
          <p className="dispatch-console__kpi-hint">
            {recommendationCount > 0 ? `${recommendationCount} decisions ready` : "Monitoring"}
          </p>
        </div>
      </div>
    </header>
  );
}
