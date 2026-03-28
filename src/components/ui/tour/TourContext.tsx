"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTourForPath, tourConfigs, demoGuidedTourConfig } from "@/src/lib/tours/config";
import { tourStepSelector } from "@/src/lib/tours/types";
import type { TourConfig, TourStep } from "@/src/lib/tours/types";
import { getCompletedTourIds, markTourComplete } from "@/app/(authenticated)/tours/actions";

export const DEMO_SESSION_RESET_EVENT = "cornerstone:demo-session-reset";

function computeDemoDwellElapsed(
  stepEngagedAt: number,
  pausedAccumMs: number,
  pauseBeganAt: number | null
): number {
  const pauseExtra = pauseBeganAt != null ? Date.now() - pauseBeganAt : 0;
  return Date.now() - stepEngagedAt - pausedAccumMs - pauseExtra;
}

function pathnameMatchesStep(pathname: string, step: TourStep): boolean {
  const path = step.path?.replace(/\/$/, "") || "";
  if (!path) return true;
  const norm = pathname.replace(/\/$/, "") || "/";
  return norm === path || (path !== "/" && norm.startsWith(path + "/"));
}

type TourContextValue = {
  activeTour: TourConfig | null;
  stepIndex: number;
  stepCount: number;
  targetRect: DOMRect | null;
  isDemoGuest: boolean;
  /** Demo-guided: true when minimum dwell time has passed for the current spotlight step. */
  canAdvanceNext: boolean;
  /** Demo-guided: seconds remaining until Next unlocks (0 when ready). */
  dwellSecondsRemaining: number;
  isTourPaused: boolean;
  next: () => void;
  back: () => void;
  skip: () => void;
  startTour: (tourId: string) => void;
  restartCurrent: () => void;
  toggleTourPause: () => void;
  replayDemoFromStart: () => void;
  completedTourIds: Set<string>;
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
const TARGET_POLL_MAX_ATTEMPTS = 40;
const TARGET_POLL_INTERVAL_MS = 150;
const PENDING_STEP_SETTLE_MS = 320;

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
  const targetPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTourPaused, setIsTourPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const stepEngagedAtRef = useRef(0);
  const pausedAccumMsRef = useRef(0);
  const pauseBeganAtRef = useRef<number | null>(null);

  const refreshCompleted = useCallback(async () => {
    const ids = await getCompletedTourIds();
    setCompletedTourIds(new Set(ids));
  }, []);

  const runTour = useCallback((config: TourConfig) => {
    setActiveTour(config);
    setStepIndex(0);
    setPendingStepIndex(null);
    setTargetRect(null);
    setIsTourPaused(false);
    pausedAccumMsRef.current = 0;
    pauseBeganAtRef.current = null;
    stepEngagedAtRef.current = Date.now();
  }, []);

  const endTour = useCallback((markComplete: boolean, tourId: string) => {
    setActiveTour(null);
    setStepIndex(0);
    setTargetRect(null);
    setPendingStepIndex(null);
    setIsTourPaused(false);
    pauseBeganAtRef.current = null;
    pausedAccumMsRef.current = 0;
    if (markComplete) {
      setCompletedTourIds((prev) => new Set(prev).add(tourId));
      void markTourComplete(tourId);
    }
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
    }
    setTargetRect(null);
    return false;
  }, []);

  const scrollToStep = useCallback((config: TourConfig, index: number) => {
    const step = config.steps[index];
    if (!step || step.variant === "cta") return;
    const el = resolveStepElement(config, step);
    if (el && isElementVisible(el)) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

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
        if (attempt >= TARGET_POLL_MAX_ATTEMPTS) return;
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
    if (activeTour.id === "demo-guided") {
      const cur = activeTour.steps[stepIndex];
      const dwell = activeTour.dwellMsPerStep ?? 0;
      if (cur?.variant !== "cta" && dwell > 0) {
        const elapsed = computeDemoDwellElapsed(
          stepEngagedAtRef.current,
          pausedAccumMsRef.current,
          pauseBeganAtRef.current
        );
        if (elapsed < dwell) return;
      }
    }
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

  const replayDemoFromStart = useCallback(() => {
    if (!activeTour || activeTour.id !== "demo-guided") {
      restartCurrent();
      return;
    }
    setIsTourPaused(false);
    pauseBeganAtRef.current = null;
    pausedAccumMsRef.current = 0;
    clearTargetPolling();
    setStepIndex(0);
    setPendingStepIndex(null);
    const step0 = activeTour.steps[0];
    if (step0?.path && !pathnameMatchesStep(pathname, step0)) {
      setPendingStepIndex(0);
      router.push(step0.path);
    } else {
      scrollToStep(activeTour, 0);
      requestAnimationFrame(() => pollForStepTarget(activeTour, 0));
    }
    stepEngagedAtRef.current = Date.now();
  }, [activeTour, pathname, router, restartCurrent, scrollToStep, pollForStepTarget, clearTargetPolling]);

  const toggleTourPause = useCallback(() => {
    setIsTourPaused((p) => {
      if (!p) {
        pauseBeganAtRef.current = Date.now();
      } else if (pauseBeganAtRef.current != null) {
        pausedAccumMsRef.current += Date.now() - pauseBeganAtRef.current;
        pauseBeganAtRef.current = null;
      }
      return !p;
    });
  }, []);

  useEffect(() => {
    if (!activeTour || activeTour.id !== "demo-guided") return;
    stepEngagedAtRef.current = Date.now();
    pausedAccumMsRef.current = 0;
    pauseBeganAtRef.current = null;
    setIsTourPaused(false);
  }, [activeTour?.id, stepIndex]);

  useEffect(() => {
    if (!activeTour || activeTour.id !== "demo-guided" || isTourPaused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [activeTour, isTourPaused, stepIndex]);

  const { canAdvanceNext, dwellSecondsRemaining } = useMemo(() => {
    if (!activeTour || activeTour.id !== "demo-guided") {
      return { canAdvanceNext: true, dwellSecondsRemaining: 0 };
    }
    const step = activeTour.steps[stepIndex];
    const dwellMs = activeTour.dwellMsPerStep ?? 0;
    if (!step || step.variant === "cta" || dwellMs <= 0) {
      return { canAdvanceNext: true, dwellSecondsRemaining: 0 };
    }
    void tick;
    const elapsed = computeDemoDwellElapsed(
      stepEngagedAtRef.current,
      pausedAccumMsRef.current,
      pauseBeganAtRef.current
    );
    const remainingMs = Math.max(0, dwellMs - elapsed);
    return {
      canAdvanceNext: elapsed >= dwellMs,
      dwellSecondsRemaining: Math.ceil(remainingMs / 1000),
    };
  }, [activeTour, stepIndex, tick, isTourPaused]);

  useEffect(() => {
    if (!activeTour) return;
    const t = setTimeout(() => pollForStepTarget(activeTour, stepIndex), 100);
    return () => clearTimeout(t);
  }, [activeTour, stepIndex, pollForStepTarget]);

  useEffect(() => {
    if (!activeTour || activeTour.id !== "demo-guided") return;
    const onResizeOrScroll = () => pollForStepTarget(activeTour, stepIndex);
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [activeTour, stepIndex, pollForStepTarget]);

  useEffect(() => {
    const onSessionReset = () => {
      if (activeTour?.id === "demo-guided") {
        endTour(false, "demo-guided");
      }
    };
    window.addEventListener(DEMO_SESSION_RESET_EVENT, onSessionReset);
    return () => window.removeEventListener(DEMO_SESSION_RESET_EVENT, onSessionReset);
  }, [activeTour, endTour]);

  useEffect(() => {
    if (isDemoWorkspace || activeTour) return;
    const config = getTourForPath(pathname);
    if (!config || completedTourIds.has(config.id)) return;
    if (hasAutoStarted.current === config.id) return;
    hasAutoStarted.current = config.id;
    const timer = setTimeout(() => runTour(config), 400);
    return () => clearTimeout(timer);
  }, [pathname, completedTourIds, runTour, isDemoWorkspace, activeTour]);

  useEffect(() => {
    const config = getTourForPath(pathname);
    if (!config) hasAutoStarted.current = null;
  }, [pathname]);

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

  useEffect(() => {
    if (!activeTour || activeTour.id !== "demo-guided" || pendingStepIndex === null) return;
    const step = activeTour.steps[pendingStepIndex];
    if (!step || !pathnameMatchesStep(pathname, step)) return;
    const t = setTimeout(() => {
      setStepIndex(pendingStepIndex);
      setPendingStepIndex(null);
      scrollToStep(activeTour, pendingStepIndex);
      pollForStepTarget(activeTour, pendingStepIndex);
    }, PENDING_STEP_SETTLE_MS);
    return () => clearTimeout(t);
  }, [pathname, activeTour, pendingStepIndex, scrollToStep, pollForStepTarget]);

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
    canAdvanceNext,
    dwellSecondsRemaining,
    isTourPaused,
    next,
    back,
    skip,
    startTour,
    restartCurrent,
    toggleTourPause,
    replayDemoFromStart,
    completedTourIds,
    refreshCompleted,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
