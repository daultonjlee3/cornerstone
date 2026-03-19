"use client";

import "intro.js/minified/introjs.min.css";
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import introJs, { type Tour } from "intro.js";
import { markTourComplete } from "@/app/(authenticated)/tours/actions";
import { getGuidanceTourById, getLiveDemoTour, getProductTourForPath } from "@/src/lib/guidance/registry";
import { resolveAvailableSteps } from "@/src/lib/guidance/utils";
import type { GuidanceStartOptions } from "@/src/lib/guidance/types";

type GuidanceContextValue = {
  activeTourId: string | null;
  startTour: (tourId: string, options?: GuidanceStartOptions) => Promise<void>;
  startProductTourForCurrentPage: () => Promise<void>;
  startLiveDemoTour: () => Promise<void>;
  hasProductTourForCurrentPage: boolean;
  isLiveDemoMode: boolean;
};

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

type GuidanceProviderProps = {
  children: ReactNode;
  isDemoGuest?: boolean;
};

export function GuidanceProvider({
  children,
  isDemoGuest = false,
}: GuidanceProviderProps) {
  const pathname = usePathname();
  const query = useSearchParams();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const router = useRouter();
  const introRef = useRef<Tour | null>(null);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const isLiveDemoMode =
    isDemoGuest ||
    pathname.startsWith("/demo") ||
    searchParams?.get("demo") === "true";

  const launchTour = useCallback(
    async (tourId: string, options: GuidanceStartOptions = {}) => {
      const tour = getGuidanceTourById(tourId);
      if (!tour) return;

      if (introRef.current) {
        introRef.current.exit(true);
        introRef.current = null;
      }

      let routedSteps = tour.steps;
      const firstRoute = routedSteps.find((step) => step.route)?.route ?? null;
      if (firstRoute && pathname !== firstRoute && !pathname.startsWith(`${firstRoute}/`)) {
        router.push(firstRoute);
        await new Promise((resolve) => setTimeout(resolve, 220));
      }

      routedSteps = tour.steps.filter((step) => {
        if (!step.route) return true;
        const normalized = pathname.replace(/\/$/, "");
        const route = step.route.replace(/\/$/, "");
        return normalized === route || normalized.startsWith(`${route}/`);
      });

      const availableSteps = await resolveAvailableSteps(routedSteps);
      if (availableSteps.length === 0) return;

      const introSteps = availableSteps.map((step) => ({
        element: step.selector,
        title: step.title,
        intro: step.content,
        position: step.position ?? "auto",
      }));

      const intro = introJs();
      introRef.current = intro;
      setActiveTourId(tourId);
      intro.setOptions({
        steps: introSteps,
        showProgress: true,
        hidePrev: false,
        nextLabel: "Next",
        prevLabel: "Back",
        doneLabel: "Done",
        skipLabel: "Skip",
        exitOnOverlayClick: true,
        disableInteraction: false,
        overlayOpacity: 0.08,
        scrollToElement: true,
        scrollTo: "element",
      });
      intro.onexit(() => {
        setActiveTourId(null);
        introRef.current = null;
      });
      intro.oncomplete(() => {
        setActiveTourId(null);
        introRef.current = null;
        if (options.force !== true) {
          void markTourComplete(tourId);
        }
      });
      intro.start();
    },
    [pathname, router]
  );

  const startTour = useCallback(
    async (tourId: string, options?: GuidanceStartOptions) => {
      await launchTour(tourId, options);
    },
    [launchTour]
  );

  const productTour = useMemo(() => getProductTourForPath(pathname), [pathname]);
  const hasProductTourForCurrentPage = productTour != null;

  const startProductTourForCurrentPage = useCallback(async () => {
    if (!productTour) return;
    await launchTour(productTour.id, { force: true });
  }, [launchTour, productTour]);

  const startLiveDemoTour = useCallback(async () => {
    const liveDemoTour = getLiveDemoTour();
    if (!liveDemoTour) return;
    await launchTour(liveDemoTour.id, { force: true });
  }, [launchTour]);

  const value = useMemo<GuidanceContextValue>(
    () => ({
      activeTourId,
      startTour,
      startProductTourForCurrentPage,
      startLiveDemoTour,
      hasProductTourForCurrentPage,
      isLiveDemoMode,
    }),
    [
      activeTourId,
      startTour,
      startProductTourForCurrentPage,
      startLiveDemoTour,
      hasProductTourForCurrentPage,
      isLiveDemoMode,
    ]
  );

  useEffect(() => {
    const requestedTour = query.get("startTour");
    if (!requestedTour) return;
    void launchTour(requestedTour, { force: true });
    const next = new URLSearchParams(query.toString());
    next.delete("startTour");
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [launchTour, pathname, query, router]);

  return <GuidanceContext.Provider value={value}>{children}</GuidanceContext.Provider>;
}

export function useGuidance(): GuidanceContextValue {
  const ctx = useContext(GuidanceContext);
  if (!ctx) throw new Error("useGuidance must be used within GuidanceProvider");
  return ctx;
}
