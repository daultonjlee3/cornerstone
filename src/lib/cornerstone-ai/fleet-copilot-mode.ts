import type { ProductProfile } from "@/src/types/fleet";
import type { FleetCopilotScreen } from "./types";
import { resolveFleetCopilotScreen } from "./copilot-prompts-config";

export function isFleetCopilotMode(
  productProfile: ProductProfile | undefined,
  route?: string
): boolean {
  if (productProfile === "fleet_intelligence") return true;
  if (productProfile === "hybrid" && route) {
    const screen = resolveFleetCopilotScreen(route);
    return screen !== "default";
  }
  return false;
}

export function fleetScreenFromRoute(route?: string): FleetCopilotScreen {
  if (!route) return "default";
  return resolveFleetCopilotScreen(route);
}
