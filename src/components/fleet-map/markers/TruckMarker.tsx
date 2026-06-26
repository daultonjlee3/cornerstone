"use client";

import { memo } from "react";
import {
  FleetTruck,
  mapTruckVisualStatus,
  type FleetBadgeType,
  type FleetTruckStatus,
} from "@/src/components/fleet/icons";
import "@/src/components/fleet/icons/fleet-icons.css";

export type TruckMarkerState = FleetTruckStatus;

type TruckMarkerProps = {
  state: TruckMarkerState;
  unitNumber: string;
  headingDeg?: number | null;
  dimmed?: boolean;
  badge?: FleetBadgeType;
};

export const TruckMarker = memo(function TruckMarker({
  state,
  unitNumber,
  headingDeg,
  dimmed,
  badge,
}: TruckMarkerProps) {
  return (
    <FleetTruck
      status={mapTruckVisualStatus(state)}
      unitLabel={unitNumber}
      heading={headingDeg}
      dimmed={dimmed}
      badge={badge}
      size="sm"
    />
  );
});
