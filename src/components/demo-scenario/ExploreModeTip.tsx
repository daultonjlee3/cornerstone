"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoScenario } from "@/hooks/useDemoScenario";

const TIP_DURATION_MS = 6000;
const NUDGE_DELAY_MS = 15000;
const NUDGE_INTERACTIONS = 2;

export function ExploreModeTip() {
  const pathname = usePathname();
  const { exploreMode } = useDemoScenario();
  const [tipVisible, setTipVisible] = useState(true);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Count pathname changes as interactions (user navigated).
  useEffect(() => {
    if (!exploreMode) return;
    if (pathname !== prevPathname) {
      setPrevPathname(pathname);
      setInteractionCount((c) => c + 1);
    }
  }, [exploreMode, pathname, prevPathname]);

  // Hide tip after duration or when nudge shows.
  useEffect(() => {
    if (!exploreMode || !tipVisible) return;
    const t = setTimeout(() => setTipVisible(false), TIP_DURATION_MS);
    return () => clearTimeout(t);
  }, [exploreMode, tipVisible]);

  // Show nudge after delay or after N interactions.
  useEffect(() => {
    if (!exploreMode || nudgeDismissed) return;
    const showNudge = () => setNudgeVisible(true);
    const byTime = setTimeout(showNudge, NUDGE_DELAY_MS);
    return () => clearTimeout(byTime);
  }, [exploreMode, nudgeDismissed]);

  useEffect(() => {
    if (!exploreMode || nudgeDismissed || interactionCount < NUDGE_INTERACTIONS) return;
    setNudgeVisible(true);
  }, [exploreMode, nudgeDismissed, interactionCount]);

  const dismissTip = useCallback(() => setTipVisible(false), []);
  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true);
    setNudgeVisible(false);
  }, []);

  if (!exploreMode) return null;

  return (
    <>
      {tipVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-4 right-4 z-[9000] flex justify-center sm:left-6 sm:right-auto"
        >
          <button
            type="button"
            onClick={dismissTip}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/95 px-4 py-3 text-left text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <span className="font-medium">Tip:</span> Try opening a work order or assigning a technician.
          </button>
        </div>
      )}

      {nudgeVisible && (
        <div
          role="dialog"
          aria-label="Try with your own data"
          className="fixed bottom-6 right-6 z-[9000] w-full max-w-[20rem] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.2)]"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">
            Want to try this with your own data?
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/signup"
              onClick={dismissNudge}
              className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Start Your Workspace
            </Link>
            <button
              type="button"
              onClick={dismissNudge}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
