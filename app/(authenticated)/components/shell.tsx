"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endImpersonation } from "@/app/platform/impersonate/actions";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { TourProvider, TourOverlay } from "@/src/components/ui/tour";
import { GuidedTourProvider } from "@/hooks/useGuidedTour";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { CornerstoneAiPanel } from "./cornerstone-ai-panel";
import { Sparkles } from "lucide-react";
import { DemoScenarioProvider } from "@/hooks/useDemoScenario";
import { DemoScenarioOverlay } from "@/src/components/demo-scenario/DemoScenarioOverlay";
import { ExploreModeTip } from "@/src/components/demo-scenario/ExploreModeTip";
import { GetStartedOnboardingProvider } from "@/hooks/useGetStartedOnboarding";
import { GetStartedChecklist } from "./get-started/GetStartedChecklist";
import { GetStartedOverlay } from "./get-started/GetStartedOverlay";
import { OperationOptimizationProvider } from "@/src/components/operation-optimization/OperationOptimizationProvider";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
  userName: string;
  showPlatformAdmin?: boolean;
  impersonationBanner?: { actingAsName: string; companyName: string } | null;
  completedTourIds?: string[];
  isDemoGuest?: boolean;
};

export function Shell({
  children,
  tenantName,
  companyName,
  userName,
  showPlatformAdmin = false,
  impersonationBanner = null,
  completedTourIds = [],
  isDemoGuest = false,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setSidebarCollapsed(stored === null ? true : stored === "1");
  }, []);

  // Called by GuidedTourProvider when tour steps begin — ensure sidebar is
  // visible and expanded so tour targets are reachable.
  const handleTourActive = useCallback(() => {
    setSidebarOpen(true);
    setSidebarCollapsed(false);
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "0");
  }, []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDispatchFullscreen =
    pathname === "/dispatch" && searchParams.get("dispatch_fullscreen") === "1";

  // When ?screenshotMode=true is present, suppress all tours, modals, and
  // onboarding overlays so Playwright captures clean product UI.
  const isScreenshotMode = searchParams.get("screenshotMode") === "true";

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  // In screenshot mode, pass all known tour IDs as completed so page-level
  // tours never auto-start regardless of what the server fetched from Supabase.
  const ALL_TOUR_IDS = [
    "dashboard",
    "assets",
    "work-orders",
    "dispatch",
    "preventive-maintenance",
    "inventory",
    "purchase-orders",
    "demo-guided",
  ];
  const effectiveCompletedIds = isScreenshotMode
    ? ALL_TOUR_IDS
    : completedTourIds;

  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  return (
    <TooltipProvider>
      <GuidedTourProvider
        autoShow={false}
        onTourActive={handleTourActive}
      >
        <TourProvider completedTourIds={effectiveCompletedIds}>
          <TourOverlay />
          {!isScreenshotMode && <GuidedTour />}
          <DemoScenarioProvider isDemoGuest={isDemoGuest && !isScreenshotMode}>
            <GetStartedOnboardingProvider disabled={isDemoGuest || isScreenshotMode}>
              <OperationOptimizationProvider>
                <GetStartedOverlay />
                <GetStartedChecklist />
                <DemoScenarioOverlay />
                <ExploreModeTip />
                <div className="flex h-screen overflow-hidden text-[var(--foreground)]">
                  {!isDispatchFullscreen ? (
                    <Sidebar
                      open={sidebarOpen}
                      onClose={() => setSidebarOpen(false)}
                      collapsed={sidebarCollapsed}
                      onToggleCollapse={handleToggleCollapse}
                      showPlatformAdmin={showPlatformAdmin}
                      isDemoGuest={isDemoGuest}
                      showResumeOnboarding={!isDemoGuest && !isScreenshotMode}
                    />
                  ) : null}
                  {/* Main panel: fills remaining width, column layout, scrollable content */}
                  <div
                    className={`flex min-h-0 flex-1 flex-col ${
                      isDispatchFullscreen
                        ? ""
                        : sidebarCollapsed
                          ? "lg:pl-[4.25rem]"
                          : "lg:pl-60"
                    }`}
                  >
                    {!isDispatchFullscreen ? (
                      <TopBar
                        tenantName={tenantName}
                        companyName={companyName}
                        userName={userName}
                        onMenuClick={() => setSidebarOpen(true)}
                        isImpersonating={!!impersonationBanner}
                        onReturnToProfile={
                          impersonationBanner ? () => endImpersonation("/operations") : undefined
                        }
                      />
                    ) : null}
                    {impersonationBanner ? (
                      <ImpersonationBanner
                        actingAsName={impersonationBanner.actingAsName}
                        companyName={impersonationBanner.companyName}
                      />
                    ) : null}
                    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                      {isDispatchFullscreen ? (
                        <div className="h-full min-h-0 flex-1 px-2 py-2">{children}</div>
                      ) : (
                        <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col px-3 py-4 sm:px-4 sm:py-5 lg:max-w-[1200px] lg:px-6 lg:py-6">
                          {children}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {!isDispatchFullscreen && !isScreenshotMode ? (
                  <>
                    <div className="fixed bottom-5 right-5 z-40">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setAiPanelOpen(true)}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                            aria-label="Ask Cornerstone"
                          >
                            <Sparkles className="size-5" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Ask Cornerstone</TooltipContent>
                      </Tooltip>
                    </div>
                    <CornerstoneAiPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
                  </>
                ) : null}
              </OperationOptimizationProvider>
            </GetStartedOnboardingProvider>
          </DemoScenarioProvider>
        </TourProvider>
      </GuidedTourProvider>
    </TooltipProvider>
  );
}
