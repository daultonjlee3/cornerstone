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
import {
  ensureAndGetDemoScenarioContextWithModeAction,
  type DemoScenarioContext,
} from "@/app/(authenticated)/demo-scenario/actions";
import { DEMO_STEPS, type DemoScenarioStep, type DemoScenarioStepKey } from "@/src/lib/demo-scenario/steps";

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
const GET_STARTED_STORAGE_KEY = "cornerstone_get_started_v1";

export function DemoScenarioProvider({ children, isDemoGuest }: DemoScenarioProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scenarioCtx, setScenarioCtx] = useState<DemoScenarioContext | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const lastResetTokenRef = useRef<string | null>(null);

  const isDemoMode = !exploreMode && (isIntroOpen || stepIndex > 0);
  const step: DemoScenarioStep = DEMO_STEPS[stepIndex] ?? DEMO_STEPS[0];
  const isDemoEntry =
    isDemoGuest ||
    pathname.startsWith("/demo") ||
    searchParams.get("demo") === "true";

  useEffect(() => {
    if (!isDemoEntry) {
      lastResetTokenRef.current = null;
      return;
    }
    const resetToken = `${pathname}|${searchParams.toString()}|${isDemoGuest ? "demo-guest" : "standard"}`;
    if (lastResetTokenRef.current === resetToken) return;
    lastResetTokenRef.current = resetToken;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(INTRO_SHOWN_KEY);
      sessionStorage.removeItem("demo_welcome_modal_v2");
      sessionStorage.removeItem("cornerstone_demo_scenario_step");
      sessionStorage.removeItem("cornerstone_demo_scenario_ctx");
      localStorage.removeItem(GET_STARTED_STORAGE_KEY);
      localStorage.removeItem("cornerstone_demo_scenario_state");
      // Keep dispatch runtime so drag/drop assignments survive page refresh in demo mode.
      // This key is intentionally cleared only when the browser tab/session is reset.
    }
    setScenarioCtx(null);
    setStepError(null);
    setIsStarting(false);
    setExploreMode(isDemoGuest ? true : false);
    setStepIndex(0);
    setIsIntroOpen(false);
  }, [isDemoEntry, isDemoGuest, pathname, searchParams]);

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
      let res = await ensureAndGetDemoScenarioContextWithModeAction(false);
      if (res.error || !res.ctx) {
        // Silent fallback: force reinitialize once before surfacing a user-facing error.
        res = await ensureAndGetDemoScenarioContextWithModeAction(true);
      }
      if (res.error || !res.ctx) {
        setStepError(
          res.error === "Unauthorized."
            ? "Please sign in to run the demo."
            : "Setting up the demo. Please try again."
        );
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
    [
      isDemoMode,
      isIntroOpen,
      nextStep,
      restartDemo,
      scenarioCtx,
      startDemo,
      step.key,
      stepError,
      stepIndex,
      isStarting,
      exploreMode,
      enterExploreMode,
    ]
  );

  return <DemoScenarioContext.Provider value={value}>{children}</DemoScenarioContext.Provider>;
}
