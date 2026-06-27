/** In-page section anchors on /operations — hash links avoid RSC reloads. */
export const FLEET_OPS_SECTION_IDS = {
  recommendations: "fleet-recommendations",
  exceptions: "fleet-exceptions",
} as const;

export type FleetOpsSection = keyof typeof FLEET_OPS_SECTION_IDS;

export function fleetOperationsSectionHref(section: FleetOpsSection): string {
  return `/operations#${FLEET_OPS_SECTION_IDS[section]}`;
}

export function scrollToFleetOperationsSection(section: FleetOpsSection): boolean {
  const id = FLEET_OPS_SECTION_IDS[section];
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function navigateToFleetOperationsSection(section: FleetOpsSection): void {
  const href = fleetOperationsSectionHref(section);
  const id = FLEET_OPS_SECTION_IDS[section];
  if (window.location.pathname === "/operations") {
    window.history.replaceState(null, "", href);
    scrollToFleetOperationsSection(section);
    return;
  }
  window.location.assign(href);
}
