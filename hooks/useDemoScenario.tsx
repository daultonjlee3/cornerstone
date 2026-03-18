"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getDemoScenarioContextAction, type DemoScenarioContext } from "@/app/(authenticated)/demo-scenario/actions";
import { DEMO_STEPS, type DemoScenarioStepKey } from "@/src/lib/demo-scenario/steps";

type DemoScenarioContextValue = {
  isDemoMode: boolean;
  isIntroOpen: boolean;
  stepIndex: number;
  stepKey: DemoScenarioStepKey;
  scenarioCtx: DemoScenarioContext | null;
  stepError: string | null;
  isStarting: boolean;
  /** True after user clicks "Explore the App" on post-demo overlay; hides step overlay, keeps demo data. */
  exploreMode: boolean;
  startDemo: () => void;
  nextStep: () => void;
  restartDemo: () => void;
  /** Close post-demo overlay and enter explore mode (full nav, demo data kept). */
  enterExploreMode: () => void;
};

const DemoScenarioContext = createContext<DemoScenarioContextValue | null>(null);

export function useDemoScenario(): DemoScenarioContextValue {
  const ctx = useContext(DemoScenarioContext);
  if (!ctx) throw new Error("useDemoScenario must be used within DemoScenarioProvider");
  return ctx;
}

type DemoScenarioProviderProps = {
  children: ReactNode;
  isDemoGuest: boolean;
};

const INTRO_SHOWN_KEY = "cornerstone_demo_scenario_intro_shown_v1";

export function DemoScenarioProvider({ children, isDemoGuest }: DemoScenarioProviderProps) {
  const router = useRouter();
  const [scenarioCtx, setScenarioCtx] = useState<DemoScenarioContext | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [exploreMode, setExploreMode] = useState(false);

  const isDemoMode = !exploreMode && (isIntroOpen || stepIndex > 0);
  const step = DEMO_STEPS[stepIndex] ?? DEMO_STEPS[0];

  useEffect(() => {
    if (!isDemoGuest) return;
    if (typeof window === "undefined") return;
    const shown = sessionStorage.getItem(INTRO_SHOWN_KEY) === "1";
    if (!shown) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsIntroOpen(true);
      setStepIndex(0);
    }
  }, [isDemoGuest]);

  const navigateToStep = useCallback(
    (index: number, ctx: DemoScenarioContext) => {
      const nextStep = DEMO_STEPS[index];
      const route = nextStep?.route ? nextStep.route(ctx) : null;
      if (route) router.push(route);
    },
    [router]
  );

  const startDemo = useCallback(() => {
    if (!isIntroOpen && stepIndex !== 0) return;
    if (isStarting) return;
    setStepError(null);
    setIsStarting(true);
    void (async () => {
      const res = await getDemoScenarioContextAction();
      if (res.error || !res.ctx) {
        setStepError(res.error ?? "Failed to load demo context.");
        setIsStarting(false);
        return;
      }
      setScenarioCtx(res.ctx);
      setIsIntroOpen(false);
      setStepIndex(1);
      navigateToStep(1, res.ctx);
      sessionStorage.setItem(INTRO_SHOWN_KEY, "1");
      setIsStarting(false);
    })();
  }, [isIntroOpen, isStarting, navigateToStep, stepIndex]);

  const nextStep = useCallback(() => {
    if (!scenarioCtx) return;
    if (stepIndex >= DEMO_STEPS.length - 1) return;
    setStepError(null);
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    if (nextIndex < DEMO_STEPS.length - 1) navigateToStep(nextIndex, scenarioCtx);
    // For the final overlay step, we do not auto-navigate.
  }, [navigateToStep, scenarioCtx, stepIndex]);

  const restartDemo = useCallback(() => {
    setScenarioCtx(null);
    setStepError(null);
    setExploreMode(false);
    setIsIntroOpen(true);
    setStepIndex(0);
    router.push("/operations");
  }, [router]);

  const enterExploreMode = useCallback(() => {
    setExploreMode(true);
  }, []);

  const value = useMemo<DemoScenarioContextValue>(
    () => ({
      isDemoMode,
      isIntroOpen,
      stepIndex,
      stepKey: step.key,
      scenarioCtx,
      stepError,
      isStarting,
      exploreMode,
      startDemo,
      nextStep,
      restartDemo,
      enterExploreMode,
    }),
    [isDemoMode, isIntroOpen, nextStep, restartDemo, scenarioCtx, startDemo, step.key, stepError, stepIndex, isStarting, exploreMode, enterExploreMode]
  );

  return <DemoScenarioContext.Provider value={value}>{children}</DemoScenarioContext.Provider>;
}

