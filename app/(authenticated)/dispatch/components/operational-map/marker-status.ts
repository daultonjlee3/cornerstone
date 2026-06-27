import type { FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { isLateJob, operationalRiskMessage } from "../fleet-dispatch-utils";
import type { JobVisualState, TruckVisualState } from "./types";

export function truckVisualState(
  lane: FleetDispatchTruckLane,
  highlightedTruckId: string | null,
  recTopTruckId: string | undefined,
  highRevenueThreshold = Infinity,
  dragTruckId: string | null = null
): TruckVisualState {
  if (dragTruckId === lane.truck_id) return "dragging";
  if (highlightedTruckId === lane.truck_id) return "selected";
  if (recTopTruckId === lane.truck_id) return "recommended";
  if (lane.telematics_status === "offline") return "offline";
  if (lane.status === "maintenance" || lane.maintenance_note) return "critical";
  const inProgress = lane.jobs.some((j) => j.status === "in_progress");
  if (inProgress) return "working";
  if (lane.jobs.length > 0 || lane.utilization >= 0.75) return "driving";
  if (lane.status === "active" && lane.jobs.length === 0) {
    if ((lane.idle_hours ?? 0) >= 1.5) return "idle";
    if ((lane.revenue_today ?? 0) >= highRevenueThreshold) return "highRevenue";
    return "available";
  }
  return "driving";
}

export function jobVisualState(
  job: FleetDispatchJob,
  selectedJobId: string | null,
  recJobId: string | undefined,
  dragContext?: {
    dragTruckId: string | null;
    eligibleJobIds: Set<string>;
    invalidJobIds: Set<string>;
    hoverDropJobId: string | null;
  }
): JobVisualState {
  if (dragContext?.hoverDropJobId === job.id) return "dropTarget";
  if (dragContext?.dragTruckId) {
    if (dragContext.eligibleJobIds.has(job.id)) return "eligible";
    if (dragContext.invalidJobIds.has(job.id)) return "invalid";
  }
  if (selectedJobId === job.id) return "selected";
  if (recJobId === job.id) return "recommended";
  if (isLateJob(job)) return "late";
  if (operationalRiskMessage(job)) return "risk";
  if (job.status === "unassigned" || !job.assigned_truck_id) return "waiting";
  return "normal";
}
