"use client";

import { useEffect } from "react";
import type { FleetPerformanceDashboardData } from "@/src/types/fleet";
import { useFleetCopilot } from "@/src/components/fleet-intelligence/FleetCopilotProvider";

type FleetPerformanceCopilotBridgeProps = {
  data: FleetPerformanceDashboardData;
  branchId?: string | null;
  truckId?: string | null;
};

/** Pushes visible Fleet Performance table data into copilot page context. */
export function FleetPerformanceCopilotBridge({
  data,
  branchId,
  truckId,
}: FleetPerformanceCopilotBridgeProps) {
  const { updateFleetContext } = useFleetCopilot();

  useEffect(() => {
    updateFleetContext({
      screen: "performance",
      branchId: branchId ?? null,
      pageContext: {
        dateRange: { from: data.from, to: data.to },
        filters: {
          ...(branchId ? { branch_id: branchId } : {}),
          ...(truckId ? { truck_id: truckId } : {}),
        },
        branchPerformance: data.branches.map((b) => ({
          branch_name: b.branch_name,
          contribution: b.contribution,
          revenue: b.revenue,
          rank: b.rank,
        })),
        truckPerformance: data.trucks.slice(0, 25).map((t) => ({
          unit_number: t.unit_number,
          contribution: t.contribution,
          branch_name: t.branch_name,
          rank: t.rank,
        })),
        summaryLine: `Total contribution ${Math.round(data.summary.totalContribution).toLocaleString()} (${data.from}–${data.to})`,
      },
    });
  }, [data, branchId, truckId, updateFleetContext]);

  return null;
}
