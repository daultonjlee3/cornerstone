"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endImpersonation } from "@/app/platform/impersonate/actions";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { CornerstoneAiPanel } from "./cornerstone-ai-panel";
import { Sparkles } from "lucide-react";
import { DemoScenarioProvider } from "@/hooks/useDemoScenario";
import { GetStartedOnboardingProvider } from "@/hooks/useGetStartedOnboarding";
import { GetStartedChecklist } from "./get-started/GetStartedChecklist";
import { GetStartedOverlay } from "./get-started/GetStartedOverlay";
import { OperationOptimizationProvider } from "@/src/components/operation-optimization/OperationOptimizationProvider";
import { GuidanceProvider } from "@/src/components/guidance/GuidanceProvider";
import { DemoWelcomePanel } from "@/src/components/guidance/DemoWelcomePanel";

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

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDispatchFullscreen =
    pathname === "/dispatch" && searchParams.get("dispatch_fullscreen") === "1";
  const isDemoWorkspace =
    isDemoGuest ||
    pathname.startsWith("/demo") ||
    searchParams.get("demo") === "true";

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

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  void completedTourIds;

  return (
    <TooltipProvider>
      <DemoScenarioProvider isDemoGuest={isDemoGuest && !isScreenshotMode}>
        <GuidanceProvider isDemoGuest={isDemoGuest && !isScreenshotMode}>
          <GetStartedOnboardingProvider disabled={isDemoGuest || isScreenshotMode}>
            <OperationOptimizationProvider>
              <GetStartedOverlay />
              <GetStartedChecklist />
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
                        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col px-2 py-2">{children}</div>
                      ) : (
                        <div
                          className={`mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-col px-3 py-4 sm:px-4 sm:py-5 lg:max-w-[1200px] lg:px-6 lg:py-6 ${
                            isDemoWorkspace ? "" : "flex-1"
                          }`}
                        >
                          <DemoWelcomePanel />
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
        </GuidanceProvider>
      </DemoScenarioProvider>
    </TooltipProvider>
  );
}
