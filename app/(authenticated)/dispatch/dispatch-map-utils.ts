import { toDateOnlyString } from "@/src/lib/date-utils";
import type { DispatchWorkOrder } from "./types";
import type { DispatchTechnicianWorkload } from "./dispatch-data";

export type Coordinate = { latitude: number; longitude: number };

export type TechnicianRouteSegment = {
  fromLabel: string;
  toWorkOrderId: string;
  toWorkOrderNumber: string;
  distanceMiles: number;
  travelMinutes: number;
};

export type TechnicianRoute = {
  technicianId: string;
  technicianName: string;
  start: Coordinate;
  orderedJobs: DispatchWorkOrder[];
  segments: TechnicianRouteSegment[];
  travelByWorkOrderId: Map<string, string>;
};

export function hasCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineMiles(a: Coordinate, b: Coordinate): number {
  const earthRadiusMiles = 3958.8;
  const latDiff = toRadians(b.latitude - a.latitude);
  const lonDiff = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);

  const sinLat = Math.sin(latDiff / 2);
  const sinLon = Math.sin(lonDiff / 2);
  const root =
    sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLon * sinLon;
  const arc = 2 * Math.atan2(Math.sqrt(root), Math.sqrt(1 - root));
  return earthRadiusMiles * arc;
}

export function estimateTravelMinutes(distanceMiles: number, averageMph = 30): number {
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) return 0;
  if (!Number.isFinite(averageMph) || averageMph <= 0) return 0;
  return Math.round((distanceMiles / averageMph) * 60);
}

function priorityRank(priority: string | null | undefined): number {
  const value = String(priority ?? "").toLowerCase();
  if (value === "emergency") return 0;
  if (value === "urgent") return 1;
  if (value === "high") return 2;
  if (value === "medium") return 3;
  if (value === "low") return 4;
  return 5;
}

function dueRank(value: string | null | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

export function buildTechnicianRoute(
  technician: DispatchTechnicianWorkload,
  workOrders: DispatchWorkOrder[],
  selectedDate: string
): TechnicianRoute | null {
  if (!hasCoordinate(technician.latitude, technician.longitude)) return null;
  const start = {
    latitude: technician.latitude as number,
    longitude: technician.longitude as number,
  };
  const activeAssigned = workOrders.filter((workOrder) => {
    if (workOrder.assigned_technician_id !== technician.id) return false;
    const status = String(workOrder.status ?? "").toLowerCase();
    if (status === "completed" || status === "cancelled") return false;
    return hasCoordinate(workOrder.latitude, workOrder.longitude);
  });
  if (activeAssigned.length === 0) {
    return {
      technicianId: technician.id,
      technicianName: technician.name,
      start,
      orderedJobs: [],
      segments: [],
      travelByWorkOrderId: new Map<string, string>(),
    };
  }

  const selectedDayJobs = activeAssigned.filter(
    (workOrder) => toDateOnlyString(workOrder.scheduled_date) === selectedDate
  );
  const candidateJobs = selectedDayJobs.length > 0 ? selectedDayJobs : activeAssigned;

  const orderedJobs = [...candidateJobs].sort((a, b) => {
    const prioritySort = priorityRank(a.priority) - priorityRank(b.priority);
    if (prioritySort !== 0) return prioritySort;
    const dueSort = dueRank(a.due_date) - dueRank(b.due_date);
    if (dueSort !== 0) return dueSort;
    const aDistance = haversineMiles(start, {
      latitude: a.latitude as number,
      longitude: a.longitude as number,
    });
    const bDistance = haversineMiles(start, {
      latitude: b.latitude as number,
      longitude: b.longitude as number,
    });
    return aDistance - bDistance;
  });

  const segments: TechnicianRouteSegment[] = [];
  const travelByWorkOrderId = new Map<string, string>();
  let previousPoint = start;
  let previousLabel = "Technician start";

  orderedJobs.forEach((workOrder) => {
    const currentPoint = {
      latitude: workOrder.latitude as number,
      longitude: workOrder.longitude as number,
    };
    const distanceMiles = haversineMiles(previousPoint, currentPoint);
    const travelMinutes = estimateTravelMinutes(distanceMiles);
    const workOrderNumber =
      workOrder.work_order_number ??
      (workOrder.title ? workOrder.title.slice(0, 16) : workOrder.id.slice(0, 8));

    segments.push({
      fromLabel: previousLabel,
      toWorkOrderId: workOrder.id,
      toWorkOrderNumber: workOrderNumber,
      distanceMiles,
      travelMinutes,
    });
    travelByWorkOrderId.set(
      workOrder.id,
      `${travelMinutes} min • ${distanceMiles.toFixed(1)} mi from previous`
    );

    previousPoint = currentPoint;
    previousLabel = workOrderNumber;
  });

  return {
    technicianId: technician.id,
    technicianName: technician.name,
    start,
    orderedJobs,
    segments,
    travelByWorkOrderId,
  };
}

export type WorkOrderCluster = {
  id: string;
  latitude: number;
  longitude: number;
  workOrders: DispatchWorkOrder[];
};

export function clusterWorkOrders(
  workOrders: DispatchWorkOrder[],
  zoomLevel: number
): WorkOrderCluster[] {
  const thresholdMiles =
    zoomLevel >= 13 ? 0 : zoomLevel >= 11 ? 0.35 : zoomLevel >= 9 ? 0.75 : 1.5;

  const coordinateWorkOrders = workOrders.filter((workOrder) =>
    hasCoordinate(workOrder.latitude, workOrder.longitude)
  );
  if (thresholdMiles === 0) {
    return coordinateWorkOrders.map((workOrder) => ({
      id: `single-${workOrder.id}`,
      latitude: workOrder.latitude as number,
      longitude: workOrder.longitude as number,
      workOrders: [workOrder],
    }));
  }

  const clusters: WorkOrderCluster[] = [];
  coordinateWorkOrders.forEach((workOrder) => {
    const point = {
      latitude: workOrder.latitude as number,
      longitude: workOrder.longitude as number,
    };
    const cluster = clusters.find((candidate) => {
      return (
        haversineMiles(
          { latitude: candidate.latitude, longitude: candidate.longitude },
          point
        ) <= thresholdMiles
      );
    });
    if (!cluster) {
      clusters.push({
        id: `cluster-${workOrder.id}`,
        latitude: point.latitude,
        longitude: point.longitude,
        workOrders: [workOrder],
      });
      return;
    }
    const nextWorkOrders = [...cluster.workOrders, workOrder];
    const nextLatitude =
      nextWorkOrders.reduce((sum, row) => sum + (row.latitude as number), 0) /
      nextWorkOrders.length;
    const nextLongitude =
      nextWorkOrders.reduce((sum, row) => sum + (row.longitude as number), 0) /
      nextWorkOrders.length;
    cluster.workOrders = nextWorkOrders;
    cluster.latitude = nextLatitude;
    cluster.longitude = nextLongitude;
  });
  return clusters;
}
