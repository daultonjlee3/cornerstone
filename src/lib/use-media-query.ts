"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the viewport matches the given media query.
 * SSR-safe: returns false until mounted, then updates to match.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setMatches(false);
      return;
    }
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", listener);
    return () => m.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** True when viewport is at least 1024px (Tailwind lg). */
export function useIsLg(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** True when viewport is at least 768px (Tailwind md). */
export function useIsMd(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
