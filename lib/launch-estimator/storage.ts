import type { LaunchEstimatorState } from "./types";
import { STORAGE_KEY } from "./config";
import { DEFAULT_INPUT } from "./calculate";

export function loadEstimatorState(): LaunchEstimatorState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LaunchEstimatorState;
  } catch {
    return null;
  }
}

export function saveEstimatorState(state: LaunchEstimatorState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function clearEstimatorState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createInitialState(): LaunchEstimatorState {
  return {
    step: 0,
    input: { ...DEFAULT_INPUT },
    result: null,
    lead: {},
  };
}
