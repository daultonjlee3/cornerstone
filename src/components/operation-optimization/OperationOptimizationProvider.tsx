"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { OptimizationProposal } from "@/src/lib/ops-optimization/types";

type OperationOptimizationContextValue = {
  proposals: OptimizationProposal[];
  refreshProposals: () => Promise<void>;
  lastUpdatedAt: number | null;
};

const OperationOptimizationContext = createContext<OperationOptimizationContextValue | null>(null);

export function OperationOptimizationProvider({ children }: { children: React.ReactNode }) {
  const [proposals, setProposals] = useState<OptimizationProposal[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/optimization-proposals", { method: "GET" });
      if (!res.ok) throw new Error("Failed to load optimization proposals");
      const payload = (await res.json()) as { proposals?: OptimizationProposal[] };
      setProposals(Array.isArray(payload.proposals) ? payload.proposals : []);
      setLastUpdatedAt(Date.now());
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProposals();

    const onRefresh = () => void refreshProposals();
    window.addEventListener("cornerstone:ops-optimization-refresh", onRefresh);

    // Soft interval refresh; keeps language/action copilot feeling fresh.
    const interval = window.setInterval(() => void refreshProposals(), 2 * 60 * 1000);

    return () => {
      window.removeEventListener("cornerstone:ops-optimization-refresh", onRefresh);
      window.clearInterval(interval);
    };
  }, [refreshProposals]);

  const value = useMemo(
    () => ({
      proposals,
      refreshProposals,
      lastUpdatedAt,
    }),
    [proposals, refreshProposals, lastUpdatedAt]
  );

  return (
    <OperationOptimizationContext.Provider value={value}>
      {children}
    </OperationOptimizationContext.Provider>
  );
}

export function useOperationOptimizationProposals() {
  const ctx = useContext(OperationOptimizationContext);
  if (!ctx) throw new Error("useOperationOptimizationProposals must be used within OperationOptimizationProvider");
  return ctx;
}

