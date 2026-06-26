"use client";

import { useEffect } from "react";
import type { FleetRecommendationInstance } from "@/src/types/fleet";
import { useFleetCopilot } from "@/src/components/fleet-intelligence/FleetCopilotProvider";
import { snapshotFromRecommendation } from "@/src/lib/cornerstone-ai/fleet-copilot-utils";

type FleetDispatchCopilotBridgeProps = {
  activeRecommendation: FleetRecommendationInstance | null;
  branchId?: string | null;
};

/** Syncs dispatch UI selection into Fleet Intelligence Copilot context. */
export function FleetDispatchCopilotBridge({
  activeRecommendation,
  branchId,
}: FleetDispatchCopilotBridgeProps) {
  const { updateFleetContext, clearSelectedRecommendation } = useFleetCopilot();

  useEffect(() => {
    if (activeRecommendation) {
      updateFleetContext({
        screen: "dispatch",
        branchId: branchId ?? null,
        selectedRecommendation: snapshotFromRecommendation(activeRecommendation),
      });
    } else {
      clearSelectedRecommendation();
    }
  }, [
    activeRecommendation,
    branchId,
    updateFleetContext,
    clearSelectedRecommendation,
  ]);

  return null;
}
