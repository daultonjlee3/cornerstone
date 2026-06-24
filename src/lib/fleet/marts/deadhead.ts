import {
  estimateTravelMinutes,
  haversineMiles,
  hasCoordinate,
  type Coordinate,
} from "@/app/(authenticated)/dispatch/dispatch-map-utils";

export type DeadheadEstimate = {
  miles: number;
  travelMinutes: number;
  isEstimated: true;
};

export function estimateDeadheadMiles(
  truckPoint: { latitude: number | null; longitude: number | null },
  jobPoint: { latitude: number | null; longitude: number | null }
): DeadheadEstimate | null {
  if (
    !hasCoordinate(truckPoint.latitude, truckPoint.longitude) ||
    !hasCoordinate(jobPoint.latitude, jobPoint.longitude)
  ) {
    return null;
  }

  const from: Coordinate = {
    latitude: truckPoint.latitude as number,
    longitude: truckPoint.longitude as number,
  };
  const to: Coordinate = {
    latitude: jobPoint.latitude as number,
    longitude: jobPoint.longitude as number,
  };

  const miles = haversineMiles(from, to);
  return {
    miles: Math.round(miles * 100) / 100,
    travelMinutes: estimateTravelMinutes(miles),
    isEstimated: true,
  };
}
