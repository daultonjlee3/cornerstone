export {
  FLEET_ICON_SIZES,
  FLEET_TRUCK_COLORS,
  FLEET_JOB_COLORS,
  FLEET_FACILITY_COLORS,
  FLEET_OPS_COLORS,
  FLEET_BADGE_COLORS,
  resolveIconSize,
} from "./tokens";
export type { FleetIconSize } from "./tokens";

export type {
  FleetTruckStatus,
  FleetJobStatus,
  FleetBadgeType,
  FleetTruckProps,
  FleetJobProps,
  FleetClusterProps,
  FleetMarkerBaseProps,
} from "./types";

export { CornerstoneTruckSvg } from "./CornerstoneTruckSvg";
export { FleetStatusRing } from "./FleetStatusRing";
export { FleetBadge, FleetBadges } from "./FleetBadges";
export { FleetMarker } from "./FleetMarker";
export { FleetTruck } from "./FleetTruck";
export { FleetJob } from "./FleetJob";
export { FleetCluster } from "./FleetCluster";
export { FleetBranch } from "./FleetBranch";
export { FleetAlert } from "./FleetAlert";
export { FleetRoute } from "./FleetRoute";
/** @deprecated Use MapLayerIcon from @/src/components/design-system/icons in UI panels. Kept for map marker internals. */
export { FleetOperationIcon } from "./FleetOperationIcons";
export type { FleetOperationIconName } from "./FleetOperationIcons";
export { mapTruckVisualStatus, mapJobVisualStatus, truckBadgeFromLane } from "./mappers";
