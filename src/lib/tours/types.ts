/**
 * Guided onboarding tour types.
 * Steps are identified by tourId:stepId and matched to elements with data-tour="tourId:stepId".
 */

/** Spotlight (default) or full-screen final CTA (no target highlight). */
export type TourStepVariant = "spotlight" | "cta";

export type TourStep = {
  id: string;
  title: string;
  content: string;
  /** Optional CTA for the Next button (e.g. "Next: See how work starts"). */
  cta?: string;
  /** Optional explicit selector (falls back to data-tour="tourId:stepId"). */
  selector?: string;
  /** Short label for the action the user takes on the highlighted control (action-driven demos). */
  actionCta?: string;
  /** For cross-route tours: route to be on for this step (navigate here before showing step). */
  path?: string;
  /** Spotlight highlights a target; cta is a closing screen (no data-tour target). */
  variant?: TourStepVariant;
  /** When true, hide Back/Next — user advances by taking the action described in copy. */
  hideNext?: boolean;
};

export type TourConfig = {
  id: string;
  name: string;
  /** Path pattern: exact path (e.g. /dashboard) or prefix (e.g. /work-orders). Tour runs when pathname matches. */
  path: string;
  steps: TourStep[];
  /** If false, tour is only started manually (e.g. welcome modal); never auto-started by path. Default true. */
  autoStart?: boolean;
  /**
   * For demo-guided: minimum ms on each spotlight step before Next unlocks.
   * Pausing the tour freezes this timer. CTA / final steps ignore this.
   */
  dwellMsPerStep?: number;
};

/** Build data-tour attribute value for a step. */
export function tourStepAttr(tourId: string, stepId: string): string {
  return `${tourId}:${stepId}`;
}

/** Selector for the target element of a step. */
export function tourStepSelector(tourId: string, stepId: string): string {
  return `[data-tour="${tourStepAttr(tourId, stepId)}"]`;
}
