"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type DemoScenarioContext = null;
export type DemoScenarioStepKey = "intro";

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

export function DemoScenarioProvider({ children, isDemoGuest }: DemoScenarioProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scenarioCtx] = useState<DemoScenarioContext | null>(null);
  const [stepError] = useState<string | null>(null);
  const [isStarting] = useState(false);
  const [exploreMode, setExploreMode] = useState(true);

  const isDemoEntry =
    isDemoGuest ||
    pathname.startsWith("/demo") ||
    searchParams.get("demo") === "true";

  const isDemoMode = isDemoEntry;
  const stepKey: DemoScenarioStepKey = "intro";
  const stepIndex = 0;
  const isIntroOpen = false;

  const startDemo = useCallback(() => {}, []);
  const nextStep = useCallback(() => {}, []);
  const restartDemo = useCallback(() => {
    setExploreMode(true);
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
      stepKey,
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
      stepIndex,
      stepKey,
      scenarioCtx,
      stepError,
      isStarting,
      exploreMode,
      startDemo,
      nextStep,
      restartDemo,
      enterExploreMode,
    ]
  );

  return <DemoScenarioContext.Provider value={value}>{children}</DemoScenarioContext.Provider>;
}

