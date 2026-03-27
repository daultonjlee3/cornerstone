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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTourForPath, tourConfigs, demoGuidedTourConfig } from "@/src/lib/tours/config";
import { tourStepSelector } from "@/src/lib/tours/types";
import type { TourConfig, TourStep } from "@/src/lib/tours/types";
import { getCompletedTourIds, markTourComplete } from "@/app/(authenticated)/tours/actions";

function pathnameMatchesStep(pathname: string, step: TourStep): boolean {
  const path = step.path?.replace(/\/$/, "") || "";
  if (!path) return true;
  const norm = pathname.replace(/\/$/, "") || "/";
  return norm === path || (path !== "/" && norm.startsWith(path + "/"));
}

type TourContextValue = {
  /** Currently running tour or null. */
  activeTour: TourConfig | null;
  /** 0-based step index. */
  stepIndex: number;
  /** Total steps. */
  stepCount: number;
  /** Current step's target element (if any). */
  targetRect: DOMRect | null;
  /** True when the live demo / demo guest workspace is active (suppresses generic path tours). */
  isDemoGuest: boolean;
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
const DEMO_SPOTLIGHT_PADDING = 10;
const TARGET_POLL_MAX_ATTEMPTS = 12;
const TARGET_POLL_INTERVAL_MS = 120;

function resolveStepElement(config: TourConfig, step: TourStep): HTMLElement | null {
  const selector = step.selector ?? tourStepSelector(config.id, step.id);
  return document.querySelector<HTMLElement>(selector);
}

function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

export function TourProvider({
  children,
  completedTourIds: initialCompleted = [],
  isDemoGuest = false,
}: {
  children: ReactNode;
  completedTourIds?: string[];
  isDemoGuest?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoWorkspace = isDemoGuest || searchParams.get("demo") === "true";
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [pendingStepIndex, setPendingStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [completedTourIds, setCompletedTourIds] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const hasAutoStarted = useRef<string | null>(null);
  const tourStepRef = useRef({ activeTour: null as TourConfig | null, stepIndex: 0 });
  const targetPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCompleted = useCallback(async () => {
    const ids = await getCompletedTourIds();
    setCompletedTourIds(new Set(ids));
  }, []);

  const runTour = useCallback((config: TourConfig) => {
    setActiveTour(config);
    setStepIndex(0);
    setPendingStepIndex(null);
    setTargetRect(null);
  }, []);

  const startTour = useCallback(
    (tourId: string) => {
      const c = tourConfigs.find((t) => t.id === tourId);
      if (!c) return;
      if (c.id === "demo-guided") {
        runTour(c);
        const step0 = c.steps[0];
        if (step0?.path && !pathnameMatchesStep(pathname, step0)) {
          setPendingStepIndex(0);
          router.push(step0.path);
        }
        return;
      }
      const config = getTourForPath(pathname);
      if (config?.id === tourId) {
        runTour(config);
        return;
      }
      runTour(c);
    },
    [pathname, runTour, router]
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

  const updateTargetRect = useCallback((config: TourConfig, index: number): boolean => {
    const step = config.steps[index];
    if (!step) {
      setTargetRect(null);
      return true;
    }
    if (step.variant === "cta") {
      setTargetRect(null);
      return true;
    }
    const el = resolveStepElement(config, step);
    if (el && isElementVisible(el)) {
      const pad = config.id === "demo-guided" ? DEMO_SPOTLIGHT_PADDING : SPOTLIGHT_PADDING;
      const rect = el.getBoundingClientRect();
      setTargetRect(
        new DOMRect(
          rect.left - pad,
          rect.top - pad,
          rect.width + pad * 2,
          rect.height + pad * 2
        )
      );
      return true;
    } else {
      setTargetRect(null);
      return false;
    }
  }, []);

  const scrollToStep = useCallback(
    (config: TourConfig, index: number) => {
      const step = config.steps[index];
      if (!step || step.variant === "cta") return;
      const el = resolveStepElement(config, step);
      if (el && isElementVisible(el)) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    []
  );

  const clearTargetPolling = useCallback(() => {
    if (targetPollTimeoutRef.current) {
      clearTimeout(targetPollTimeoutRef.current);
      targetPollTimeoutRef.current = null;
    }
  }, []);

  const pollForStepTarget = useCallback(
    (config: TourConfig, index: number) => {
      const poll = (attempt: number) => {
        const step = config.steps[index];
        if (!step || step.variant === "cta") {
          setTargetRect(null);
          return;
        }
        const found = updateTargetRect(config, index);
        if (found) return;
        if (attempt >= TARGET_POLL_MAX_ATTEMPTS) {
          if (config.id === "demo-guided" && index < config.steps.length - 1) {
            setStepIndex((prev) => (prev === index ? index + 1 : prev));
          }
          return;
        }
        clearTargetPolling();
        targetPollTimeoutRef.current = setTimeout(() => {
          poll(attempt + 1);
        }, TARGET_POLL_INTERVAL_MS);
      };
      poll(0);
    },
    [clearTargetPolling, updateTargetRect]
  );

  const next = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex >= activeTour.steps.length - 1) {
      endTour(true, activeTour.id);
      return;
    }
    const nextIndex = stepIndex + 1;
    const nextStep = activeTour.steps[nextIndex];
    const isCrossRoute = activeTour.id === "demo-guided" && nextStep?.path;
    if (isCrossRoute && nextStep && !pathnameMatchesStep(pathname, nextStep)) {
      setPendingStepIndex(nextIndex);
      router.push(nextStep.path!);
      return;
    }
    setStepIndex(nextIndex);
    scrollToStep(activeTour, nextIndex);
    requestAnimationFrame(() => pollForStepTarget(activeTour, nextIndex));
  }, [activeTour, stepIndex, pathname, endTour, scrollToStep, pollForStepTarget, router]);

  const back = useCallback(() => {
    if (!activeTour || stepIndex <= 0) return;
    const prevIndex = stepIndex - 1;
    const prevStep = activeTour.steps[prevIndex];
    const isCrossRoute = activeTour.id === "demo-guided" && prevStep?.path;
    if (isCrossRoute && prevStep && !pathnameMatchesStep(pathname, prevStep)) {
      setPendingStepIndex(prevIndex);
      router.push(prevStep.path!);
      return;
    }
    setStepIndex(prevIndex);
    scrollToStep(activeTour, prevIndex);
    requestAnimationFrame(() => pollForStepTarget(activeTour, prevIndex));
  }, [activeTour, stepIndex, pathname, scrollToStep, pollForStepTarget, router]);

  const skip = useCallback(() => {
    if (!activeTour) return;
    endTour(true, activeTour.id);
  }, [activeTour, endTour]);

  const restartCurrent = useCallback(() => {
    if (!activeTour) return;
    const step0 = activeTour.steps[0];
    if (activeTour.id === "demo-guided" && step0?.path && !pathnameMatchesStep(pathname, step0)) {
      setPendingStepIndex(0);
      setStepIndex(0);
      router.push(step0.path);
      return;
    }
    setStepIndex(0);
    setPendingStepIndex(null);
    scrollToStep(activeTour, 0);
    requestAnimationFrame(() => pollForStepTarget(activeTour, 0));
  }, [activeTour, pathname, scrollToStep, pollForStepTarget, router]);

  // When step index or active tour changes, update target rect (after a tick so DOM is ready).
  useEffect(() => {
    if (!activeTour) return;
    const t = setTimeout(() => pollForStepTarget(activeTour, stepIndex), 100);
    return () => clearTimeout(t);
  }, [activeTour, stepIndex, pollForStepTarget]);

  useEffect(() => {
    tourStepRef.current = { activeTour, stepIndex };
  }, [activeTour, stepIndex]);

  // Auto-start tour when pathname matches and tour not completed.
  useEffect(() => {
    if (isDemoWorkspace || activeTour) return;
    const config = getTourForPath(pathname);
    if (!config || completedTourIds.has(config.id)) return;
    if (hasAutoStarted.current === config.id) return;
    hasAutoStarted.current = config.id;
    const timer = setTimeout(() => runTour(config), 400);
    return () => clearTimeout(timer);
  }, [pathname, completedTourIds, runTour, isDemoWorkspace, activeTour]);

  // Reset auto-start when leaving the path so revisiting can trigger again if not completed.
  useEffect(() => {
    const config = getTourForPath(pathname);
    if (!config) hasAutoStarted.current = null;
  }, [pathname]);

  // When navigating away from the tour's path, end the active tour (except cross-route demo-guided).
  useEffect(() => {
    if (!activeTour) return;
    if (activeTour.id === "demo-guided") return;
    const config = getTourForPath(pathname);
    if (!config || config.id !== activeTour.id) {
      const cleanup = setTimeout(() => {
        setActiveTour(null);
        setStepIndex(0);
        setTargetRect(null);
      }, 0);
      return () => clearTimeout(cleanup);
    }
  }, [pathname, activeTour]);

  // Cross-route demo-guided: after navigating, land on the step when pathname matches.
  useEffect(() => {
    if (!activeTour || activeTour.id !== "demo-guided" || pendingStepIndex === null) return;
    const step = activeTour.steps[pendingStepIndex];
    if (!step || !pathnameMatchesStep(pathname, step)) return;
    const t = setTimeout(() => {
      setStepIndex(pendingStepIndex);
      setPendingStepIndex(null);
      scrollToStep(activeTour, pendingStepIndex);
      pollForStepTarget(activeTour, pendingStepIndex);
    }, 150);
    return () => clearTimeout(t);
  }, [pathname, activeTour, pendingStepIndex, scrollToStep, pollForStepTarget]);

  // Start demo-guided from URL param (e.g. Settings "Start tour" -> /operations?startTour=demo-guided).
  useEffect(() => {
    const startParam = searchParams.get("startTour");
    if (pathname.replace(/\/$/, "") !== "/operations" || startParam !== "demo-guided") return;
    const kickoff = setTimeout(() => {
      runTour(demoGuidedTourConfig);
      router.replace("/operations", { scroll: false });
    }, 0);
    return () => clearTimeout(kickoff);
  }, [pathname, searchParams, runTour, router]);

  useEffect(() => {
    return () => clearTargetPolling();
  }, [clearTargetPolling]);

  const value: TourContextValue = {
    activeTour,
    stepIndex,
    stepCount: activeTour?.steps.length ?? 0,
    targetRect,
    isDemoGuest,
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
