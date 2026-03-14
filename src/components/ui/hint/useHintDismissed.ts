"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "cornerstone-hint-dismissed-";

export function useHintDismissed(hintId: string): [boolean, () => void] {
  const [dismissed, setDismissedState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissedState(window.localStorage.getItem(STORAGE_PREFIX + hintId) === "1");
    } catch {
      setDismissedState(false);
    }
  }, [hintId]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + hintId, "1");
      setDismissedState(true);
    } catch {
      setDismissedState(true);
    }
  }, [hintId]);

  return [dismissed, dismiss];
}
