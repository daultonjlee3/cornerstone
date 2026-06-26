"use client";

import { memo } from "react";
import { FleetJob, mapJobVisualStatus, type FleetJobStatus } from "@/src/components/fleet/icons";
import "@/src/components/fleet/icons/fleet-icons.css";

export type JobMarkerState = FleetJobStatus;

type JobMarkerProps = {
  state: JobMarkerState;
  priority: string;
};

export const JobMarker = memo(function JobMarker({ state, priority }: JobMarkerProps) {
  const pri = priority === "urgent" || priority === "high" ? priority : "default";

  return (
    <FleetJob
      status={mapJobVisualStatus(state)}
      priority={pri}
      size="sm"
    />
  );
});
