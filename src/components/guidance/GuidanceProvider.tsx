"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type GuidanceContextValue = {
  /** True for demo guest sessions, /demo routes, or ?demo=true */
  isLiveDemoMode: boolean;
  isDemoGuest: boolean;
};

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

type GuidanceProviderProps = {
  children: ReactNode;
  isDemoGuest?: boolean;
};

export function GuidanceProvider({
  children,
  isDemoGuest = false,
}: GuidanceProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const demoParam = searchParams.get("demo") === "true";
  const isLiveDemoMode =
    isDemoGuest || pathname.startsWith("/demo") || demoParam;

  const value = useMemo<GuidanceContextValue>(
    () => ({ isLiveDemoMode, isDemoGuest }),
    [isLiveDemoMode, isDemoGuest]
  );

  return (
    <GuidanceContext.Provider value={value}>{children}</GuidanceContext.Provider>
  );
}

export function useGuidance(): GuidanceContextValue {
  const ctx = useContext(GuidanceContext);
  if (!ctx) throw new Error("useGuidance must be used within GuidanceProvider");
  return ctx;
}
