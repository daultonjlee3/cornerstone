"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FleetPaginatedResult } from "@/src/lib/fleet/operations/pagination-types";

type UseOperationsPaginatedListOptions = {
  endpoint: string;
  date: string;
  pageSize?: number;
  enabled?: boolean;
  extraParams?: Record<string, string>;
  resetKey?: string | number;
};

export function useOperationsPaginatedList<T extends { id: string }>({
  endpoint,
  date,
  pageSize = 10,
  enabled = true,
  extraParams,
  resetKey,
}: UseOperationsPaginatedListOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          date,
          page: String(pageNum),
          pageSize: String(pageSize),
        });
        if (extraParams) {
          for (const [key, value] of Object.entries(extraParams)) {
            params.set(key, value);
          }
        }
        const res = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load list");
        const payload = (await res.json()) as FleetPaginatedResult<T>;

        setItems((prev) => {
          const merged = replace ? payload.items : [...prev, ...payload.items];
          const seen = new Set<string>();
          return merged.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
        setTotalCount(payload.totalCount);
        setHasMore(payload.hasMore);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load list");
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [date, endpoint, extraParams, pageSize]
  );

  const refresh = useCallback(async () => {
    setInitialLoading(true);
    setItems([]);
    await fetchPage(1, true);
  }, [fetchPage]);

  useEffect(() => {
    if (!enabled) return;
    setInitialLoading(true);
    setItems([]);
    setPage(1);
    void fetchPage(1, true);
  }, [enabled, date, resetKey, fetchPage]);

  useEffect(() => {
    if (!enabled || !hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loadingRef.current) {
          void fetchPage(page + 1, false);
        }
      },
      { root: node.parentElement, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, fetchPage, hasMore, loading, page]);

  return {
    items,
    totalCount,
    hasMore,
    loading,
    initialLoading,
    error,
    refresh,
    sentinelRef,
  };
}
