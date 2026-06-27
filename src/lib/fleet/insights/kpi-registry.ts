import type { FleetKpiId, FleetKpiRegistryEntry } from "./types";
import { FLEET_KPI_IDS } from "./types";

export const FLEET_KPI_REGISTRY: Record<FleetKpiId, FleetKpiRegistryEntry> = {
  "active-trucks": {
    id: "active-trucks",
    title: "Active trucks",
    description: "Live fleet units with current GPS, operator, and job context.",
  },
  "idle-offline": {
    id: "idle-offline",
    title: "Idle / offline",
    description: "Trucks needing attention — idle capacity, GPS gaps, maintenance, or missing operators.",
  },
  "jobs-today": {
    id: "jobs-today",
    title: "Jobs today",
    description: "Scheduled work by assignment status, priority, and revenue exposure.",
  },
  utilization: {
    id: "utilization",
    title: "Utilization",
    description: "Billable efficiency across branches, trucks, and operators.",
  },
  "est-contribution": {
    id: "est-contribution",
    title: "Estimated contribution",
    description: "Operational margin breakdown and highest-value opportunities.",
  },
  "deadhead-cost": {
    id: "deadhead-cost",
    title: "Deadhead cost",
    description: "Non-revenue miles and routes driving fuel and labor waste.",
  },
  "overtime-risk": {
    id: "overtime-risk",
    title: "Overtime risk",
    description: "Operators approaching thresholds with projected OT cost.",
  },
  "acceptance-rate": {
    id: "acceptance-rate",
    title: "Acceptance rate",
    description: "Recommendation outcomes, ROI, and dispatcher decision quality.",
  },
};

export function parseFleetKpiId(value: string | null | undefined): FleetKpiId | null {
  if (!value) return null;
  return FLEET_KPI_IDS.includes(value as FleetKpiId) ? (value as FleetKpiId) : null;
}

export function getFleetKpiRegistryEntry(id: FleetKpiId): FleetKpiRegistryEntry {
  return FLEET_KPI_REGISTRY[id];
}
