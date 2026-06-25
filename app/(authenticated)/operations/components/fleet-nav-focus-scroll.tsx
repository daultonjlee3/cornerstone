"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type FleetNavFocusScrollProps = {
  targets: Array<{ focusId: string; paramValue: string }>;
};

/** Scrolls to a fleet section when a sidebar deep-link query param is present. */
export function FleetNavFocusScroll({ targets }: FleetNavFocusScrollProps) {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  useEffect(() => {
    if (!focus) return;
    const match = targets.find((t) => t.paramValue === focus);
    if (!match) return;
    const el = document.getElementById(match.focusId);
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [focus, targets]);

  return null;
}
