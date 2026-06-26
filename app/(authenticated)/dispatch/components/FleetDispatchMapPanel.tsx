"use client";

import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import { FleetOperationalMap } from "./operational-map/FleetOperationalMap";

type FleetDispatchMapPanelProps = {
  jobs: FleetDispatchJob[];
  truckLanes: FleetDispatchTruckLane[];
  branchCapacity: FleetDispatchBoardData["branchCapacity"];
  recommendations: FleetRecommendationInstance[];
  selectedJobId: string | null;
  highlightedTruckId: string | null;
  activeRecommendation: FleetRecommendationInstance | null;
  onSelectJob: (id: string | null) => void;
  onSelectTruck: (id: string | null) => void;
};

export function FleetDispatchMapPanel(props: FleetDispatchMapPanelProps) {
  return <FleetOperationalMap {...props} />;
}
