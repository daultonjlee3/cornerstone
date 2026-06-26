"use client";

import { useMemo } from "react";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import {
  branchCapacityUtilizationPercent,
  formatCurrency,
  sumRecommendationContribution,
} from "./fleet-dispatch-utils";

type FleetDispatchOutlookStripProps = {
  board: FleetDispatchBoardData;
  intel: FleetTodayViewData;
  recommendations?: FleetTodayViewData["recommendations"]["pending"];
};

export function FleetDispatchOutlookStrip({
  board,
  intel,
  recommendations = intel.recommendations.pending,
}: FleetDispatchOutlookStripProps) {
  const metrics = useMemo(() => {
    const boardUtil = branchCapacityUtilizationPercent(board);
    const commandUtil = intel.commandCenter.utilizationPercent;
    const utilization =
      boardUtil ??
      (commandUtil != null && commandUtil <= 100
        ? commandUtil
        : board.truckLanes.length > 0
          ? Math.round(
              Math.min(
                100,
                (board.truckLanes.reduce((sum, lane) => sum + lane.utilization, 0) /
                  board.truckLanes.length) *
                  100
              )
            )
          : null);

    const deadheadMiles = board.jobs.reduce(
      (sum, job) => sum + (job.estimated_deadhead_miles ?? 0),
      0
    );

    const assigned = board.jobs.filter((j) => j.assigned_truck_id && j.status !== "unassigned").length;
    const onTimePct =
      board.jobs.length > 0 ? Math.round((assigned / board.jobs.length) * 100) : null;

    const fromRecs = sumRecommendationContribution(recommendations);
    const opportunity =
      fromRecs > 0
        ? fromRecs
        : intel.commandCenter.recommendationOpportunity ??
          intel.executiveInsights?.largestRecommendationOpportunity ??
          0;

    return { utilization, deadheadMiles, onTimePct, opportunity };
  }, [board, intel, recommendations]);

  return (
    <div className="dispatch-console__outlook" id="fleet-dispatch-outlook">
      <p className="dispatch-console__outlook-label">Today&apos;s outlook</p>
      <div className="dispatch-console__outlook-metrics">
        <div className="dispatch-console__outlook-metric">
          <span className="dispatch-console__outlook-metric-label">Truck utilization</span>
          <span className="dispatch-console__outlook-metric-value">
            {metrics.utilization != null ? `${metrics.utilization}%` : "—"}
          </span>
        </div>
        <div className="dispatch-console__outlook-metric">
          <span className="dispatch-console__outlook-metric-label">Deadhead</span>
          <span className="dispatch-console__outlook-metric-value">
            {metrics.deadheadMiles > 0 ? `${Math.round(metrics.deadheadMiles)} mi` : "—"}
          </span>
        </div>
        <div className="dispatch-console__outlook-metric">
          <span className="dispatch-console__outlook-metric-label">Jobs on time</span>
          <span className="dispatch-console__outlook-metric-value">
            {metrics.onTimePct != null ? `${metrics.onTimePct}%` : "—"}
          </span>
        </div>
        <div className="dispatch-console__outlook-metric dispatch-console__outlook-metric--gain">
          <span className="dispatch-console__outlook-metric-label">AI opportunity</span>
          <span className="dispatch-console__outlook-metric-value">
            {metrics.opportunity > 0 ? formatCurrency(metrics.opportunity) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
