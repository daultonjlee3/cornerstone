"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { OperationSuggestion } from "@/src/lib/ops-suggestions/types";

type OperationSuggestionsContextValue = {
  suggestions: OperationSuggestion[];
  refreshSuggestions: () => Promise<void>;
  lastUpdatedAt: number | null;
};

const OperationSuggestionsContext = createContext<OperationSuggestionsContextValue | null>(null);

export function OperationSuggestionsProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<OperationSuggestion[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/suggestions", { method: "GET" });
      if (!res.ok) throw new Error("Failed to load suggestions");
      const payload = (await res.json()) as { suggestions?: OperationSuggestion[] };
      setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSuggestions();
    const onRefresh = () => void refreshSuggestions();
    window.addEventListener("cornerstone:ops-suggestions-refresh", onRefresh);

    // Soft interval refresh: keep suggestions current without being noisy.
    const interval = window.setInterval(() => void refreshSuggestions(), 2 * 60 * 1000);
    return () => {
      window.removeEventListener("cornerstone:ops-suggestions-refresh", onRefresh);
      window.clearInterval(interval);
    };
  }, [refreshSuggestions]);

  const value = useMemo(
    () => ({
      suggestions,
      refreshSuggestions,
      lastUpdatedAt,
    }),
    [suggestions, refreshSuggestions, lastUpdatedAt]
  );

  return (
    <OperationSuggestionsContext.Provider value={value}>
      {children}
    </OperationSuggestionsContext.Provider>
  );
}

export function useOperationSuggestions() {
  const ctx = useContext(OperationSuggestionsContext);
  if (!ctx) throw new Error("useOperationSuggestions must be used within OperationSuggestionsProvider");
  return ctx;
}

