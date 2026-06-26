import type { Map as MapboxMap, LngLatBoundsLike } from "mapbox-gl";

type MapboxFlyToOptions = Parameters<MapboxMap["flyTo"]>[0];
type MapboxFitBoundsOptions = Parameters<MapboxMap["fitBounds"]>[1];

/** Standard layer toggles for fleet operational maps */
export type FleetMapLayerId =
  | "trucks"
  | "jobs"
  | "recommendations"
  | "routes"
  | "branches"
  | "revenueAtRisk"
  | "deadhead"
  | "capacity"
  | "gpsHealth"
  | "serviceAreas"
  | "geofences"
  | "traffic"
  | "heatmaps"
  | "territories";

export type FleetMapViewport = {
  bounds: [number, number, number, number] | null;
  zoom: number;
};

export type FleetMapHandle = {
  getMap: () => MapboxMap | null;
  zoomIn: () => void;
  zoomOut: () => void;
  fitBounds: (bounds: LngLatBoundsLike, options?: MapboxFitBoundsOptions) => void;
  flyTo: (options: MapboxFlyToOptions) => void;
  resetNorth: () => void;
};

export type FleetMapRouteFeature = {
  id: string;
  coordinates: [number, number][];
  primary?: boolean;
  dashed?: boolean;
};

export type FleetMapBranchZone = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  utilization: number;
  truckCount: number;
};

export type FleetMapClusterPoint<T> = {
  id: string;
  longitude: number;
  latitude: number;
  isCluster: boolean;
  pointCount?: number;
  data: T;
};
