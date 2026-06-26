export type OperationalMapLayers = {
  trucks: boolean;
  jobs: boolean;
  recommendations: boolean;
  routes: boolean;
  branches: boolean;
  revenueAtRisk: boolean;
  deadhead: boolean;
  capacity: boolean;
  gpsHealth: boolean;
};

export const DEFAULT_OPERATIONAL_LAYERS: OperationalMapLayers = {
  trucks: true,
  jobs: true,
  recommendations: true,
  routes: true,
  branches: true,
  revenueAtRisk: true,
  deadhead: false,
  capacity: true,
  gpsHealth: false,
};

export type TruckVisualState =
  | "available"
  | "busy"
  | "offline"
  | "critical"
  | "recommended"
  | "selected";

export type JobVisualState = "normal" | "late" | "risk" | "recommended" | "selected" | "waiting";

export type BranchZone = {
  branch_id: string;
  branch_name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  truckCount: number;
  utilization: number;
};
