/**
 * Guided onboarding tour types.
 * Steps are identified by tourId:stepId and matched to elements with data-tour="tourId:stepId".
 */

export type TourStep = {
  id: string;
  title: string;
  content: string;
  /** Optional CTA for the Next button (e.g. "Next: See how work starts"). */
  cta?: string;
  /** For cross-route tours: route to be on for this step (navigate here before showing step). */
  path?: string;
};

export type TourConfig = {
  id: string;
  name: string;
  /** Path pattern: exact path (e.g. /dashboard) or prefix (e.g. /work-orders). Tour runs when pathname matches. */
  path: string;
  steps: TourStep[];
  /** If false, tour is only started manually (e.g. welcome modal); never auto-started by path. Default true. */
  autoStart?: boolean;
};

/** Build data-tour attribute value for a step. */
export function tourStepAttr(tourId: string, stepId: string): string {
  return `${tourId}:${stepId}`;
}

/** Selector for the target element of a step. */
export function tourStepSelector(tourId: string, stepId: string): string {
  return `[data-tour="${tourStepAttr(tourId, stepId)}"]`;
}
