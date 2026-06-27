"use client";

import { useEffect, useRef } from "react";
import {
  FLEET_OPS_SECTION_IDS,
  scrollToFleetOperationsSection,
  type FleetOpsSection,
} from "@/src/lib/fleet/ui/operations-sections";

export const FLEET_OPS_NAV_FOCUS_TARGETS = [
  { focusId: FLEET_OPS_SECTION_IDS.recommendations, paramValue: "recommendations" },
  { focusId: FLEET_OPS_SECTION_IDS.exceptions, paramValue: "exceptions" },
] as const;

type FleetNavFocusScrollProps = {
  targets?: ReadonlyArray<{ focusId: string; paramValue: string }>;
};

function sectionFromFocusId(focusId: string): FleetOpsSection | null {
  if (focusId === FLEET_OPS_SECTION_IDS.recommendations) return "recommendations";
  if (focusId === FLEET_OPS_SECTION_IDS.exceptions) return "exceptions";
  return null;
}

function scrollToSection(focusId: string) {
  const section = sectionFromFocusId(focusId);
  if (section) {
    scrollToFleetOperationsSection(section);
    return;
  }
  document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Scrolls to a fleet section via hash or legacy ?focus= without useSearchParams (avoids RSC recompile loops). */
export function FleetNavFocusScroll({
  targets = FLEET_OPS_NAV_FOCUS_TARGETS,
}: FleetNavFocusScrollProps) {
  const normalizedRef = useRef(false);

  useEffect(() => {
    const run = () => {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get("focus");

      if (focus && !normalizedRef.current) {
        const match = targets.find((t) => t.paramValue === focus);
        if (match) {
          normalizedRef.current = true;
          const url = `${window.location.pathname}#${match.focusId}`;
          window.history.replaceState(window.history.state, "", url);
          scrollToSection(match.focusId);
          return;
        }
      }

      const hashId = window.location.hash.replace(/^#/, "");
      if (hashId) {
        scrollToSection(hashId);
      }
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [targets]);

  return null;
}

export { FLEET_OPS_SECTION_IDS };
