"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { sidebarTourSteps, TOUR_COMPLETED_KEY, TOUR_TOTAL_STEPS } from "@/config/tourSteps";

type GuidedTourContextValue = {
  /** Whether the welcome modal is visible. */
  isWelcomeOpen: boolean;
  /** Whether the step-by-step tour overlay is active. */
  isActive: boolean;
  /** Whether the completion modal is visible. */
  isCompletionOpen: boolean;
  /** Whether the user has already completed the tour (localStorage). */
  isCompleted: boolean;
  /** Current 0-based step index. */
  stepIndex: number;
  /** Total number of steps. */
  totalSteps: number;
  /** CSS selector for the current step's sidebar target. */
  currentTarget: string | null;
  /** Start the tour steps (dismisses welcome modal). */
  startTour: () => void;
  /** Skip the tour entirely (marks complete, closes all modals). */
  skipTour: () => void;
  /** Advance to the next step, or open completion modal at end. */
  nextStep: () => void;
  /** Go back one step. */
  prevStep: () => void;
  /** Re-open the welcome modal and reset tour state. */
  openWelcome: () => void;
  /** Close the welcome modal and mark complete (no tour). */
  dismissWelcome: () => void;
  /** Close the completion modal. */
  closeCompletion: () => void;
};

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
  return ctx;
}

type GuidedTourProviderProps = {
  children: ReactNode;
  /**
   * When true, the welcome modal auto-shows if the tour has not been
   * completed in localStorage (typically for demo guest users).
   */
  autoShow?: boolean;
  /**
   * Optional callback fired when the tour becomes active (first step shown).
   * Use this to expand / open the sidebar before tour steps render.
   */
  onTourActive?: () => void;
};

export function GuidedTourProvider({
  children,
  autoShow = false,
  onTourActive,
}: GuidedTourProviderProps) {
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Read localStorage on mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === "1";
    setIsCompleted(completed);
    if (!completed && autoShow) {
      const timer = setTimeout(() => setIsWelcomeOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [autoShow]);

  const markCompleted = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOUR_COMPLETED_KEY, "1");
    }
    setIsCompleted(true);
  }, []);

  const startTour = useCallback(() => {
    setIsWelcomeOpen(false);
    setStepIndex(0);
    setIsActive(true);
    onTourActive?.();
  }, [onTourActive]);

  const skipTour = useCallback(() => {
    setIsWelcomeOpen(false);
    setIsActive(false);
    setIsCompletionOpen(false);
    markCompleted();
  }, [markCompleted]);

  const nextStep = useCallback(() => {
    if (stepIndex >= TOUR_TOTAL_STEPS - 1) {
      setIsActive(false);
      setIsCompletionOpen(true);
      markCompleted();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, markCompleted]);

  const prevStep = useCallback(() => {
    if (stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const openWelcome = useCallback(() => {
    setIsActive(false);
    setIsCompletionOpen(false);
    setStepIndex(0);
    setIsCompleted(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOUR_COMPLETED_KEY);
    }
    setIsWelcomeOpen(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
    markCompleted();
  }, [markCompleted]);

  const closeCompletion = useCallback(() => {
    setIsCompletionOpen(false);
  }, []);

  const currentTarget =
    isActive ? (sidebarTourSteps[stepIndex]?.target ?? null) : null;

  const value: GuidedTourContextValue = {
    isWelcomeOpen,
    isActive,
    isCompletionOpen,
    isCompleted,
    stepIndex,
    totalSteps: TOUR_TOTAL_STEPS,
    currentTarget,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    openWelcome,
    dismissWelcome,
    closeCompletion,
  };

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
}
