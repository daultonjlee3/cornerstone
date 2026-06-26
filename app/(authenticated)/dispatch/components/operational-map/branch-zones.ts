import type { FleetDispatchBoardData, FleetDispatchTruckLane } from "@/src/types/fleet";
import { hasCoordinate } from "../../dispatch-map-utils";
import type { BranchZone } from "./types";

export function computeBranchZones(
  truckLanes: FleetDispatchTruckLane[],
  branchCapacity: FleetDispatchBoardData["branchCapacity"]
): BranchZone[] {
  const coordsByBranch = new Map<string, Array<[number, number]>>();

  for (const lane of truckLanes) {
    if (!hasCoordinate(lane.latitude, lane.longitude)) continue;
    const list = coordsByBranch.get(lane.branch_id) ?? [];
    list.push([lane.latitude as number, lane.longitude as number]);
    coordsByBranch.set(lane.branch_id, list);
  }

  return branchCapacity
    .map((branch) => {
      const coords = coordsByBranch.get(branch.branch_id);
      if (!coords?.length) return null;

      const lat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const lng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      const truckCount = truckLanes.filter((l) => l.branch_id === branch.branch_id).length;
      const radiusMeters = Math.min(85000, 18000 + truckCount * 4500 + branch.utilization * 12000);

      return {
        branch_id: branch.branch_id,
        branch_name: branch.branch_name,
        latitude: lat,
        longitude: lng,
        radiusMeters,
        truckCount,
        utilization: branch.utilization,
      } satisfies BranchZone;
    })
    .filter((zone): zone is BranchZone => zone != null);
}
