"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  FLEET_OPS_SECTION_IDS,
  scrollToFleetOperationsSection,
  type FleetOpsSection,
} from "@/src/lib/fleet/ui/operations-sections";

type FleetNavFocusScrollProps = {
  targets: Array<{ focusId: string; paramValue: string }>;
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

/** Scrolls to a fleet section via hash or legacy ?focus= without triggering RSC reloads. */
export function FleetNavFocusScroll({ targets }: FleetNavFocusScrollProps) {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  useEffect(() => {
    const run = () => {
      if (focus) {
        const match = targets.find((t) => t.paramValue === focus);
        if (match) {
          const url = `${window.location.pathname}#${match.focusId}`;
          window.history.replaceState(null, "", url);
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
  }, [focus, targets]);

  return null;
}

export { FLEET_OPS_SECTION_IDS };
