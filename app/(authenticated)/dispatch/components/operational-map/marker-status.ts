import type { FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { isLateJob, operationalRiskMessage } from "../fleet-dispatch-utils";
import type { JobVisualState, TruckVisualState } from "./types";

export function truckVisualState(
  lane: FleetDispatchTruckLane,
  highlightedTruckId: string | null,
  recTopTruckId: string | undefined
): TruckVisualState {
  if (highlightedTruckId === lane.truck_id) return "selected";
  if (recTopTruckId === lane.truck_id) return "recommended";
  if (lane.telematics_status === "offline") return "offline";
  if (lane.status === "maintenance" || lane.maintenance_note) return "critical";
  const inProgress = lane.jobs.some((j) => j.status === "in_progress");
  if (inProgress || lane.utilization >= 0.75 || lane.jobs.length > 0) return "busy";
  if (lane.status === "active" && lane.jobs.length === 0) return "available";
  return "busy";
}

export function jobVisualState(
  job: FleetDispatchJob,
  selectedJobId: string | null,
  recJobId: string | undefined
): JobVisualState {
  if (selectedJobId === job.id) return "selected";
  if (recJobId === job.id) return "recommended";
  if (isLateJob(job)) return "late";
  if (operationalRiskMessage(job)) return "risk";
  if (job.status === "unassigned" || !job.assigned_truck_id) return "waiting";
  return "normal";
}
