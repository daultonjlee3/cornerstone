"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { CornerstoneAiContext, FleetCopilotContextPayload } from "@/src/lib/cornerstone-ai/types";
import type { ProductProfile } from "@/src/types/fleet";
import { resolveFleetCopilotScreen } from "@/src/lib/cornerstone-ai/copilot-prompts-config";
import { isFleetCopilotMode } from "@/src/lib/cornerstone-ai/fleet-copilot-mode";

type FleetCopilotContextValue = {
  fleetMode: boolean;
  aiContext: CornerstoneAiContext;
  updateFleetContext: (patch: Partial<FleetCopilotContextPayload>) => void;
  clearSelectedRecommendation: () => void;
};

const FleetCopilotContext = createContext<FleetCopilotContextValue | null>(null);

export function FleetCopilotProvider({
  children,
  productProfile = "cmms",
}: {
  children: ReactNode;
  productProfile?: ProductProfile;
}) {
  const pathname = usePathname();
  const [fleetOverrides, setFleetOverrides] = useState<FleetCopilotContextPayload>({});

  const updateFleetContext = useCallback((patch: Partial<FleetCopilotContextPayload>) => {
    setFleetOverrides((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearSelectedRecommendation = useCallback(() => {
    setFleetOverrides((prev) => {
      const next = { ...prev };
      delete next.selectedRecommendation;
      return next;
    });
  }, []);

  const fleetMode = isFleetCopilotMode(productProfile, pathname);

  const aiContext = useMemo((): CornerstoneAiContext => {
    const screen = resolveFleetCopilotScreen(pathname);
    return {
      route: pathname,
      productProfile,
      fleet: {
        screen,
        ...fleetOverrides,
      },
    };
  }, [pathname, productProfile, fleetOverrides]);

  const value = useMemo(
    (): FleetCopilotContextValue => ({
      fleetMode,
      aiContext,
      updateFleetContext,
      clearSelectedRecommendation,
    }),
    [fleetMode, aiContext, updateFleetContext, clearSelectedRecommendation]
  );

  return (
    <FleetCopilotContext.Provider value={value}>{children}</FleetCopilotContext.Provider>
  );
}

export function useFleetCopilot(): FleetCopilotContextValue {
  const ctx = useContext(FleetCopilotContext);
  if (!ctx) {
    return {
      fleetMode: false,
      aiContext: {},
      updateFleetContext: () => {},
      clearSelectedRecommendation: () => {},
    };
  }
  return ctx;
}
