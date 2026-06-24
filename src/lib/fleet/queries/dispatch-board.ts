import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchBoardData, FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { computeTelematicsStatus, listTruckLatestPositions } from "@/src/lib/fleet/queries";
import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";

const DEFAULT_TRUCK_HOURS = 10;

function truckCapacityHours(capacity: Record<string, unknown> | null | undefined): number {
  const hours = capacity?.daily_hours;
  if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) return hours;
  return DEFAULT_TRUCK_HOURS;
}

function mapJobRow(row: Record<string, unknown>, truckPoint?: { latitude: number | null; longitude: number | null }): FleetDispatchJob {
  const site = row.customer_sites as {
    name?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  const branches = row.branches as { name?: string } | null;

  const job: FleetDispatchJob = {
    id: row.id as string,
    title: row.title as string,
    status: row.status as FleetDispatchJob["status"],
    priority: row.priority as FleetDispatchJob["priority"],
    branch_id: row.branch_id as string,
    branch_name: branches?.name ?? null,
    assigned_truck_id: (row.assigned_truck_id as string | null) ?? null,
    required_truck_type: row.required_truck_type as string,
    scheduled_start: (row.scheduled_start as string | null) ?? null,
    scheduled_end: (row.scheduled_end as string | null) ?? null,
    revenue_estimate: Number(row.revenue_estimate) || 0,
    site_name: site?.name ?? null,
    site_latitude: site?.latitude ?? null,
    site_longitude: site?.longitude ?? null,
    estimated_deadhead_miles: null,
    estimated_travel_minutes: null,
  };

  if (truckPoint) {
    const deadhead = estimateDeadheadMiles(truckPoint, {
      latitude: job.site_latitude,
      longitude: job.site_longitude,
    });
    if (deadhead) {
      job.estimated_deadhead_miles = deadhead.miles;
      job.estimated_travel_minutes = deadhead.travelMinutes;
    }
  }

  return job;
}

export async function loadFleetDispatchBoardData(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  branchId?: string | null
): Promise<FleetDispatchBoardData> {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  let jobsQuery = supabase
    .from("fleet_jobs")
    .select(
      "id, title, status, priority, branch_id, assigned_truck_id, required_truck_type, scheduled_start, scheduled_end, revenue_estimate, customer_sites(name, latitude, longitude), branches(name)"
    )
    .eq("tenant_id", tenantId)
    .gte("scheduled_start", dayStart)
    .lte("scheduled_start", dayEnd)
    .not("status", "eq", "cancelled")
    .order("scheduled_start", { ascending: true });

  if (branchId) jobsQuery = jobsQuery.eq("branch_id", branchId);

  const { data: jobData, error: jobsError } = await jobsQuery;
  if (jobsError) throw new Error(jobsError.message);

  let trucksQuery = supabase
    .from("trucks")
    .select("id, unit_number, truck_type, branch_id, status, capacity, home_latitude, home_longitude, last_telematics_at")
    .eq("tenant_id", tenantId)
    .neq("status", "retired")
    .order("unit_number");

  if (branchId) trucksQuery = trucksQuery.eq("branch_id", branchId);

  const { data: truckData, error: trucksError } = await trucksQuery;
  if (trucksError) throw new Error(trucksError.message);

  const positions = await listTruckLatestPositions(supabase, tenantId);
  const positionByTruck = new Map(positions.map((p) => [p.truck_id, p]));

  const { data: martRows, error: martError } = await supabase
    .from("utilization_daily")
    .select("truck_id, committed_hours")
    .eq("tenant_id", tenantId)
    .eq("date", date);

  if (martError) throw new Error(martError.message);

  const committedByTruck = new Map<string, number>();
  for (const row of martRows ?? []) {
    committedByTruck.set(
      (row as { truck_id: string }).truck_id,
      Number((row as { committed_hours: number }).committed_hours)
    );
  }

  let capacityQuery = supabase
    .from("branch_capacity_snapshots")
    .select("branch_id, available_truck_hours, committed_hours, branches(name)")
    .eq("tenant_id", tenantId)
    .eq("date", date);

  if (branchId) capacityQuery = capacityQuery.eq("branch_id", branchId);

  const { data: capacityData, error: capacityError } = await capacityQuery;
  if (capacityError) throw new Error(capacityError.message);

  const rawJobs = (jobData ?? []) as Record<string, unknown>[];
  const truckPoints = (truckData ?? []).map((truck) => {
    const t = truck as {
      id: string;
      home_latitude: number | null;
      home_longitude: number | null;
    };
    const pos = positionByTruck.get(t.id);
    return {
      truck_id: t.id,
      latitude: pos?.latitude ?? t.home_latitude,
      longitude: pos?.longitude ?? t.home_longitude,
    };
  });

  function nearestTruckPoint(job: Record<string, unknown>) {
    const site = job.customer_sites as { latitude?: number | null; longitude?: number | null } | null;
    if (!site?.latitude || !site?.longitude) return undefined;
    let best: { latitude: number; longitude: number } | undefined;
    let bestDist = Infinity;
    for (const tp of truckPoints) {
      const deadhead = estimateDeadheadMiles(tp, {
        latitude: site.latitude ?? null,
        longitude: site.longitude ?? null,
      });
      if (deadhead && deadhead.miles < bestDist) {
        bestDist = deadhead.miles;
        best = { latitude: tp.latitude as number, longitude: tp.longitude as number };
      }
    }
    return best;
  }

  const jobs: FleetDispatchJob[] = rawJobs.map((row) => {
    const assignedId = row.assigned_truck_id as string | null;
    let truckPoint: { latitude: number | null; longitude: number | null } | undefined;
    if (assignedId) {
      const tp = truckPoints.find((p) => p.truck_id === assignedId);
      truckPoint = tp
        ? { latitude: tp.latitude, longitude: tp.longitude }
        : undefined;
    } else {
      truckPoint = nearestTruckPoint(row);
    }
    return mapJobRow(row, truckPoint);
  });
  const unassignedJobs = jobs.filter((j) => !j.assigned_truck_id || j.status === "unassigned");

  const truckLanes: FleetDispatchTruckLane[] = (truckData ?? []).map((truck) => {
    const t = truck as {
      id: string;
      unit_number: string;
      truck_type: string;
      branch_id: string;
      status: FleetDispatchTruckLane["status"];
      capacity: Record<string, unknown>;
      home_latitude: number | null;
      home_longitude: number | null;
      last_telematics_at: string | null;
    };

    const pos = positionByTruck.get(t.id);
    const truckPoint = {
      latitude: pos?.latitude ?? t.home_latitude,
      longitude: pos?.longitude ?? t.home_longitude,
    };

    const assignedJobs = rawJobs
      .filter((j) => j.assigned_truck_id === t.id)
      .map((j) => mapJobRow(j, truckPoint));

    const available = truckCapacityHours(t.capacity);
    const committed = committedByTruck.get(t.id) ?? 0;

    return {
      truck_id: t.id,
      unit_number: t.unit_number,
      truck_type: t.truck_type,
      branch_id: t.branch_id,
      status: t.status,
      committed_hours: committed,
      available_hours: available,
      utilization: available > 0 ? committed / available : 0,
      jobs: assignedJobs,
      latitude: truckPoint.latitude,
      longitude: truckPoint.longitude,
      telematics_status: computeTelematicsStatus(t.last_telematics_at),
    };
  });

  const branchCapacity = (capacityData ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const branch = r.branches;
    const branchObj = (Array.isArray(branch) ? branch[0] : branch) as { name: string } | null;
    const available = Number(r.available_truck_hours);
    const committed = Number(r.committed_hours);
    return {
      branch_id: r.branch_id as string,
      branch_name: branchObj?.name ?? "Branch",
      available_truck_hours: available,
      committed_hours: committed,
      utilization: available > 0 ? committed / available : 0,
    };
  });

  return {
    date,
    jobs,
    unassignedJobs,
    truckLanes,
    branchCapacity,
  };
}
