"use client";

import { FleetTodayView } from "./fleet-today-view";

/** Client-first command center — renders shell immediately, loads sections progressively. */
export function FleetCommandCenterClient() {
  return <FleetTodayView progressive />;
}
