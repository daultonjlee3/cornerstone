import type { FleetOperationalException } from "@/src/types/fleet";
import { fleetOperationsSectionHref, scrollToFleetOperationsSection } from "@/src/lib/fleet/ui/operations-sections";

export type FleetExceptionActAction =
  | { kind: "scroll"; elementId: string; label: string }
  | { kind: "navigate"; href: string; label: string };

const ACTION_LABELS: Record<FleetOperationalException["category"], string> = {
  unassigned_job: "Assign",
  capacity: "Rebalance",
  idle_truck: "Assign",
  telematics: "Check GPS",
  integration: "Fix integration",
  revenue: "Review queue",
  dispatch: "Open dispatch",
  gps: "Fix location",
};

function extractEntityId(exceptionId: string, prefix: string): string | null {
  if (!exceptionId.startsWith(prefix)) return null;
  const id = exceptionId.slice(prefix.length);
  return id.length > 0 ? id : null;
}

/** Build dispatch deep link for a board date with optional entity focus. */
export function buildDispatchExceptionHref(
  boardDate: string,
  focus?: { jobId?: string; truckId?: string; branchId?: string }
): string {
  const params = new URLSearchParams({ date: boardDate });
  if (focus?.jobId) params.set("job_id", focus.jobId);
  if (focus?.truckId) params.set("truck_id", focus.truckId);
  if (focus?.branchId) params.set("branch_id", focus.branchId);
  return `/dispatch?${params.toString()}`;
}

export function resolveFleetExceptionAct(
  ex: FleetOperationalException,
  pathname: string
): FleetExceptionActAction {
  const onOperations = pathname === "/operations" || pathname.startsWith("/operations/");

  if (ex.category === "revenue") {
    if (onOperations) {
      return { kind: "scroll", elementId: "fleet-recommendations", label: "Review queue" };
    }
    return { kind: "navigate", href: fleetOperationsSectionHref("recommendations"), label: "Review queue" };
  }

  if (ex.category === "unassigned_job" && onOperations) {
    const jobId = extractEntityId(ex.id, "unassigned-");
    if (jobId) {
      return { kind: "navigate", href: ex.href, label: "Assign on map" };
    }
  }

  return {
    kind: "navigate",
    href: ex.href,
    label: ACTION_LABELS[ex.category] ?? "Act",
  };
}

export function runFleetExceptionAct(
  action: FleetExceptionActAction,
  navigate: (href: string) => void
): void {
  if (action.kind === "scroll") {
    if (scrollToFleetOperationsSection(
      action.elementId === "fleet-recommendations" ? "recommendations" : "exceptions"
    )) {
      window.history.replaceState(null, "", fleetOperationsSectionHref(
        action.elementId === "fleet-recommendations" ? "recommendations" : "exceptions"
      ));
      return;
    }
    navigate(fleetOperationsSectionHref(
      action.elementId === "fleet-recommendations" ? "recommendations" : "exceptions"
    ));
    return;
  }
  navigate(action.href);
}
