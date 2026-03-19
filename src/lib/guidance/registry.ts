import { demoTours } from "./demoTours";
import { onboardingGuides } from "./onboardingGuides";
import { productTours } from "./productTours";
import type { GuidanceTour } from "./types";

export const guidanceTours: GuidanceTour[] = [
  ...demoTours,
  ...productTours,
  ...onboardingGuides,
];

export function getGuidanceTourById(tourId: string): GuidanceTour | null {
  return guidanceTours.find((tour) => tour.id === tourId) ?? null;
}

export function getProductTourForPath(pathname: string): GuidanceTour | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (
    guidanceTours.find(
      (tour) =>
        tour.layer === "product-tour" &&
        tour.routePrefix != null &&
        (normalized === tour.routePrefix ||
          (tour.routePrefix !== "/" && normalized.startsWith(`${tour.routePrefix}/`)))
    ) ?? null
  );
}

export function getLiveDemoTour(): GuidanceTour | null {
  return guidanceTours.find((tour) => tour.layer === "live-demo") ?? null;
}
