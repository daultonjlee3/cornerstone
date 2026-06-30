import type { FleetDispatchBoardData, FleetDispatchJob } from "@/src/types/fleet";

/** Apply assignment locally for instant UI feedback before server refresh. */
export function applyOptimisticFleetAssignment(
  board: FleetDispatchBoardData,
  truckId: string,
  jobId: string
): FleetDispatchBoardData {
  const job = board.jobs.find((item) => item.id === jobId);
  if (!job) return board;

  const updatedJob: FleetDispatchJob = {
    ...job,
    assigned_truck_id: truckId,
    status: job.status === "unassigned" ? "scheduled" : job.status,
  };

  const jobs = board.jobs.map((item) => (item.id === jobId ? updatedJob : item));
  const unassignedJobs = board.unassignedJobs.filter((item) => item.id !== jobId);
  const truckLanes = board.truckLanes.map((lane) => {
    if (lane.truck_id !== truckId) return lane;
    const withoutDup = lane.jobs.filter((j) => j.id !== jobId);
    return { ...lane, jobs: [...withoutDup, updatedJob] };
  });

  return { ...board, jobs, unassignedJobs, truckLanes };
}

/** Apply multiple assignments optimistically (bulk dispatch). */
export function applyOptimisticBulkAssignments(
  board: FleetDispatchBoardData,
  pairs: Array<{ truckId: string; jobId: string }>
): FleetDispatchBoardData {
  return pairs.reduce(
    (acc, pair) => applyOptimisticFleetAssignment(acc, pair.truckId, pair.jobId),
    board
  );
}
