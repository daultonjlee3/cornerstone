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
import { usePathname } from "next/navigation";
import { progressToChecklist } from "@/src/lib/onboarding/get-started-progress";
import type { GetStartedProgress } from "@/src/lib/onboarding/get-started-progress";

const STORAGE_KEY = "cornerstone_get_started_v1";

type StoredState = {
  skipped?: boolean;
  completedAt?: string;
};

function readStored(): StoredState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredState;
    return { skipped: parsed.skipped, completedAt: parsed.completedAt };
  } catch {
    return {};
  }
}

function writeStored(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export type GetStartedChecklistState = {
  hasCreatedAsset: boolean;
  hasCreatedWorkOrder: boolean;
  hasAssignedTechnician: boolean;
  hasCompletedWorkOrder: boolean;
};

type GetStartedOnboardingContextValue = {
  progress: GetStartedProgress | null;
  checklist: GetStartedChecklistState;
  skipped: boolean;
  completedAt: string | null;
  allComplete: boolean;
  loading: boolean;
  markSkipped: () => void;
  resumeOnboarding: () => void;
  refreshProgress: () => Promise<void>;
};

const GetStartedOnboardingContext = createContext<GetStartedOnboardingContextValue | null>(null);

export function useGetStartedOnboarding(): GetStartedOnboardingContextValue {
  const ctx = useContext(GetStartedOnboardingContext);
  if (!ctx) throw new Error("useGetStartedOnboarding must be used within GetStartedOnboardingProvider");
  return ctx;
}

type GetStartedOnboardingProviderProps = {
  children: ReactNode;
  /** When true (e.g. demo guest), onboarding checklist is hidden. */
  disabled?: boolean;
};

export function GetStartedOnboardingProvider({
  children,
  disabled = false,
}: GetStartedOnboardingProviderProps) {
  const pathname = usePathname();
  const [progress, setProgress] = useState<GetStartedProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState<StoredState>(() => readStored());

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/progress");
      if (!res.ok) return;
      const data = (await res.json()) as GetStartedProgress;
      setProgress(data);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }
    void fetchProgress();
  }, [disabled, fetchProgress]);

  useEffect(() => {
    if (disabled) return;
    void fetchProgress();
  }, [pathname, disabled, fetchProgress]);

  const checklist = useMemo(
    () => (progress ? progressToChecklist(progress) : {
      hasCreatedAsset: false,
      hasCreatedWorkOrder: false,
      hasAssignedTechnician: false,
      hasCompletedWorkOrder: false,
    }),
    [progress]
  );

  const allComplete =
    checklist.hasCreatedAsset &&
    checklist.hasCreatedWorkOrder &&
    checklist.hasAssignedTechnician &&
    checklist.hasCompletedWorkOrder;

  const markSkipped = useCallback(() => {
    const next = { ...readStored(), skipped: true };
    writeStored(next);
    setStored(next);
  }, []);

  const resumeOnboarding = useCallback(() => {
    const next = { ...readStored(), skipped: false, completedAt: undefined };
    writeStored(next);
    setStored(next);
    void fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (allComplete && !stored.completedAt) {
      const next = { ...readStored(), completedAt: new Date().toISOString() };
      writeStored(next);
      setStored(next);
    }
  }, [allComplete, stored.completedAt]);

  const value = useMemo<GetStartedOnboardingContextValue>(
    () => ({
      progress,
      checklist,
      skipped: stored.skipped ?? false,
      completedAt: stored.completedAt ?? null,
      allComplete,
      loading,
      markSkipped,
      resumeOnboarding,
      refreshProgress: fetchProgress,
    }),
    [
      progress,
      checklist,
      stored.skipped,
      stored.completedAt,
      allComplete,
      loading,
      markSkipped,
      resumeOnboarding,
      fetchProgress,
    ]
  );

  return (
    <GetStartedOnboardingContext.Provider value={value}>
      {children}
    </GetStartedOnboardingContext.Provider>
  );
}
