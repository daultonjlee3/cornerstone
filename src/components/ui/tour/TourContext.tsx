"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getTourForPath, tourConfigs } from "@/src/lib/tours/config";
import { tourStepSelector } from "@/src/lib/tours/types";
import type { TourConfig } from "@/src/lib/tours/types";
import { getCompletedTourIds, markTourComplete } from "@/app/(authenticated)/tours/actions";

type TourContextValue = {
  /** Currently running tour or null. */
  activeTour: TourConfig | null;
  /** 0-based step index. */
  stepIndex: number;
  /** Total steps. */
  stepCount: number;
  /** Current step's target element (if any). */
  targetRect: DOMRect | null;
  /** Go to next step or finish. */
  next: () => void;
  /** Go to previous step. */
  back: () => void;
  /** Skip the tour (end without marking complete so it can show again, or we could mark complete - per product choice). We'll mark complete on skip so it doesn't re-appear until restart. */
  skip: () => void;
  /** Start a specific tour (e.g. from settings "Start tour"). */
  startTour: (tourId: string) => void;
  /** Restart current tour from step 0. */
  restartCurrent: () => void;
  /** Set of tour IDs the user has completed (so we don't auto-start again). */
  completedTourIds: Set<string>;
  /** Refreshes completed set from server (after restart in settings). */
  refreshCompleted: () => Promise<void>;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

const SPOTLIGHT_PADDING = 8;

export function TourProvider({
  children,
  completedTourIds: initialCompleted = [],
}: {
  children: ReactNode;
  completedTourIds?: string[];
}) {
  const pathname = usePathname();
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [completedTourIds, setCompletedTourIds] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const hasAutoStarted = useRef<string | null>(null);

  const refreshCompleted = useCallback(async () => {
    const ids = await getCompletedTourIds();
    setCompletedTourIds(new Set(ids));
  }, []);

  const runTour = useCallback((config: TourConfig) => {
    setActiveTour(config);
    setStepIndex(0);
    setTargetRect(null);
  }, []);

  const startTour = useCallback(
    (tourId: string) => {
      const config = getTourForPath(pathname);
      if (config?.id === tourId) {
        runTour(config);
        return;
      }
      const c = tourConfigs.find((t) => t.id === tourId);
      if (c) runTour(c);
    },
    [pathname, runTour]
  );

  const endTour = useCallback(
    (markComplete: boolean, tourId: string) => {
      setActiveTour(null);
      setStepIndex(0);
      setTargetRect(null);
      if (markComplete) {
        setCompletedTourIds((prev) => new Set(prev).add(tourId));
        void markTourComplete(tourId);
      }
    },
    []
  );

  const updateTargetRect = useCallback((config: TourConfig, index: number) => {
    const step = config.steps[index];
    if (!step) {
      setTargetRect(null);
      return;
    }
    const sel = tourStepSelector(config.id, step.id);
    const el = document.querySelector<HTMLElement>(sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(
        new DOMRect(
          rect.left - SPOTLIGHT_PADDING,
          rect.top - SPOTLIGHT_PADDING,
          rect.width + SPOTLIGHT_PADDING * 2,
          rect.height + SPOTLIGHT_PADDING * 2
        )
      );
    } else {
      setTargetRect(null);
    }
  }, []);

  const scrollToStep = useCallback(
    (config: TourConfig, index: number) => {
      const step = config.steps[index];
      if (!step) return;
      const sel = tourStepSelector(config.id, step.id);
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    []
  );

  const next = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex >= activeTour.steps.length - 1) {
      endTour(true, activeTour.id);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    scrollToStep(activeTour, nextIndex);
    requestAnimationFrame(() => updateTargetRect(activeTour, nextIndex));
  }, [activeTour, stepIndex, endTour, scrollToStep, updateTargetRect]);

  const back = useCallback(() => {
    if (!activeTour || stepIndex <= 0) return;
    const prevIndex = stepIndex - 1;
    setStepIndex(prevIndex);
    scrollToStep(activeTour, prevIndex);
    requestAnimationFrame(() => updateTargetRect(activeTour, prevIndex));
  }, [activeTour, stepIndex, scrollToStep, updateTargetRect]);

  const skip = useCallback(() => {
    if (!activeTour) return;
    endTour(true, activeTour.id);
  }, [activeTour, endTour]);

  const restartCurrent = useCallback(() => {
    if (!activeTour) return;
    setStepIndex(0);
    scrollToStep(activeTour, 0);
    requestAnimationFrame(() => updateTargetRect(activeTour, 0));
  }, [activeTour, scrollToStep, updateTargetRect]);

  // When step index or active tour changes, update target rect (after a tick so DOM is ready).
  useEffect(() => {
    if (!activeTour) return;
    const t = setTimeout(() => updateTargetRect(activeTour, stepIndex), 100);
    return () => clearTimeout(t);
  }, [activeTour, stepIndex, updateTargetRect]);

  // Auto-start tour when pathname matches and tour not completed.
  useEffect(() => {
    const config = getTourForPath(pathname);
    if (!config || completedTourIds.has(config.id)) return;
    if (hasAutoStarted.current === config.id) return;
    hasAutoStarted.current = config.id;
    const timer = setTimeout(() => runTour(config), 400);
    return () => clearTimeout(timer);
  }, [pathname, completedTourIds, runTour]);

  // Reset auto-start when leaving the path so revisiting can trigger again if not completed.
  useEffect(() => {
    const config = getTourForPath(pathname);
    if (!config) hasAutoStarted.current = null;
  }, [pathname]);

  // When navigating away from the tour's path, end the active tour so it doesn't block the new page.
  useEffect(() => {
    if (!activeTour) return;
    const config = getTourForPath(pathname);
    if (!config || config.id !== activeTour.id) {
      setActiveTour(null);
      setStepIndex(0);
      setTargetRect(null);
    }
  }, [pathname, activeTour]);

  const value: TourContextValue = {
    activeTour,
    stepIndex,
    stepCount: activeTour?.steps.length ?? 0,
    targetRect,
    next,
    back,
    skip,
    startTour,
    restartCurrent,
    completedTourIds,
    refreshCompleted,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}
