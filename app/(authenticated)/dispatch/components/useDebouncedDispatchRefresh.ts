"use client";

import { useCallback, useEffect, useRef } from "react";

type RefreshOptions = {
  board?: boolean;
  recommendations?: boolean;
};

type UseDebouncedDispatchRefreshArgs = {
  onRefreshBoard: () => void | Promise<void>;
  onRefreshRecommendations: () => void | Promise<void>;
  /** Debounce telematics-only signals (ms). */
  telematicsDebounceMs?: number;
};

/**
 * Coalesce SSE bursts — telematics refreshes board only; job/rec changes refresh both.
 */
export function useDebouncedDispatchRefresh({
  onRefreshBoard,
  onRefreshRecommendations,
  telematicsDebounceMs = 2000,
}: UseDebouncedDispatchRefreshArgs) {
  const telematicsTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (telematicsTimerRef.current != null) {
        window.clearTimeout(telematicsTimerRef.current);
      }
    };
  }, []);

  const runRefresh = useCallback(
    async (options: RefreshOptions) => {
      if (!mountedRef.current) return;
      const tasks: Array<Promise<void>> = [];
      if (options.board !== false) {
        tasks.push(Promise.resolve(onRefreshBoard()).then(() => undefined));
      }
      if (options.recommendations) {
        tasks.push(Promise.resolve(onRefreshRecommendations()).then(() => undefined));
      }
      await Promise.all(tasks);
    },
    [onRefreshBoard, onRefreshRecommendations]
  );

  const handleSignal = useCallback(
    (eventType: string) => {
      if (eventType === "telematics_updated") {
        if (telematicsTimerRef.current != null) {
          window.clearTimeout(telematicsTimerRef.current);
        }
        telematicsTimerRef.current = window.setTimeout(() => {
          telematicsTimerRef.current = null;
          void runRefresh({ board: true, recommendations: false });
        }, telematicsDebounceMs);
        return;
      }

      if (telematicsTimerRef.current != null) {
        window.clearTimeout(telematicsTimerRef.current);
        telematicsTimerRef.current = null;
      }

      void runRefresh({
        board: true,
        recommendations:
          eventType === "recommendations_invalidated" || eventType === "jobs_updated",
      });
    },
    [runRefresh, telematicsDebounceMs]
  );

  const subscribe = useCallback(() => {
    const source = new EventSource("/api/fleet/dispatch-board/stream");
    const onSignal = (event: Event) => handleSignal(event.type);
    source.addEventListener("recommendations_invalidated", onSignal);
    source.addEventListener("telematics_updated", onSignal);
    source.addEventListener("jobs_updated", onSignal);
    source.addEventListener("board_refresh", onSignal);
    return () => source.close();
  }, [handleSignal]);

  return { subscribe, runRefresh };
}
