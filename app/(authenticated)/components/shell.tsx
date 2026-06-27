"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endImpersonation } from "@/app/platform/impersonate/actions";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { CornerstoneAiPanel } from "./cornerstone-ai-panel";
import { Sparkles } from "lucide-react";
import { GetStartedOnboardingProvider } from "@/hooks/useGetStartedOnboarding";
import { GetStartedChecklist } from "./get-started/GetStartedChecklist";
import { GetStartedOverlay } from "./get-started/GetStartedOverlay";
import { OperationOptimizationProvider } from "@/src/components/operation-optimization/OperationOptimizationProvider";
import { GuidanceProvider } from "@/src/components/guidance/GuidanceProvider";
import { DemoWelcomePanel } from "@/src/components/guidance/DemoWelcomePanel";
import { isFleetProductProfile, usesCmmsOnboarding } from "../nav-config";
import { FleetCopilotProvider } from "@/src/components/fleet-intelligence/FleetCopilotProvider";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
  userName: string;
  showPlatformAdmin?: boolean;
  impersonationBanner?: { actingAsName: string; companyName: string } | null;
  isDemoGuest?: boolean;
  productProfile?: import("@/src/types/fleet").ProductProfile;
};

export function Shell(props: ShellProps) {
  // Pathname is stable on SSR; keep dispatch layout in sync with Suspense fallback.
  const pathname = usePathname();
  const isDispatchRoute = pathname === "/dispatch";

  return (
    <Suspense
      fallback={
        <ShellLayout
          {...props}
          isDispatchRoute={isDispatchRoute}
          isDispatchFullscreen={false}
          isScreenshotMode={false}
        />
      }
    >
      <ShellWithSearchParams {...props} isDispatchRoute={isDispatchRoute} />
    </Suspense>
  );
}

function ShellWithSearchParams({
  isDispatchRoute,
  ...props
}: ShellProps & { isDispatchRoute: boolean }) {
  const searchParams = useSearchParams();
  const isDispatchFullscreen =
    isDispatchRoute && searchParams.get("dispatch_fullscreen") === "1";
  const isScreenshotMode = searchParams.get("screenshotMode") === "true";

  return (
    <ShellLayout
      {...props}
      isDispatchRoute={isDispatchRoute}
      isDispatchFullscreen={isDispatchFullscreen}
      isScreenshotMode={isScreenshotMode}
    />
  );
}

type ShellLayoutProps = ShellProps & {
  isDispatchFullscreen: boolean;
  isScreenshotMode: boolean;
  isDispatchRoute?: boolean;
};

function ShellLayout({
  children,
  tenantName,
  companyName,
  userName,
  showPlatformAdmin = false,
  impersonationBanner = null,
  isDemoGuest = false,
  productProfile = "cmms",
  isDispatchFullscreen,
  isScreenshotMode,
  isDispatchRoute = false,
}: ShellLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "1");
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [copilotDockExpanded, setCopilotDockExpanded] = useState(false);

  useEffect(() => {
    if (isDispatchRoute) {
      setAiPanelOpen(false);
    }
  }, [isDispatchRoute]);

  const isFleetUi = isFleetProductProfile(productProfile);
  const cmmsOnboardingEnabled = usesCmmsOnboarding(productProfile);
  const getStartedEnabled = !isDemoGuest && !isScreenshotMode && cmmsOnboardingEnabled;
  const showCopilot = !isScreenshotMode && (!isDispatchFullscreen || isFleetUi);
  const copilotVariant =
    isFleetUi && (isDispatchRoute || isDispatchFullscreen) ? "docked" : "floating";
  const copilotDockedVisible = showCopilot && isFleetUi && (isDispatchRoute || isDispatchFullscreen);
  const copilotLayoutReserve = copilotDockedVisible
    ? copilotDockExpanded
      ? "max-lg:pr-0 lg:pr-[var(--fleet-copilot-width)]"
      : "max-lg:pr-0 lg:pr-[var(--fleet-copilot-collapsed-width)]"
    : "";

  return (
    <TooltipProvider>
      <GuidanceProvider isDemoGuest={isDemoGuest && !isScreenshotMode}>
        <GetStartedOnboardingProvider disabled={isDemoGuest || isScreenshotMode || !cmmsOnboardingEnabled}>
          <OperationOptimizationProvider>
            <FleetCopilotProvider productProfile={productProfile}>
            {getStartedEnabled ? <GetStartedOverlay /> : null}
            {getStartedEnabled ? <GetStartedChecklist /> : null}
            <div
              className="flex h-screen overflow-hidden text-[var(--foreground)]"
              data-fleet-ui={isFleetUi ? "true" : undefined}
              data-enterprise-ui="true"
              style={{ ["--shell-topbar-height" as string]: "3.5rem" }}
            >
              {!isDispatchFullscreen ? (
                <Sidebar
                  open={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  collapsed={sidebarCollapsed}
                  onToggleCollapse={handleToggleCollapse}
                  showPlatformAdmin={showPlatformAdmin}
                  isDemoGuest={isDemoGuest}
                  showResumeOnboarding={getStartedEnabled}
                  productProfile={productProfile}
                />
              ) : null}
              <div
                className={`flex min-h-0 flex-1 flex-col ${
                  isDispatchFullscreen
                    ? ""
                    : sidebarCollapsed
                      ? "lg:pl-[var(--nav-rail-width-collapsed)]"
                      : "lg:pl-[var(--nav-rail-width)]"
                }`}
              >
                {!isDispatchFullscreen ? (
                  <TopBar
                    tenantName={tenantName}
                    companyName={companyName}
                    userName={userName}
                    onMenuClick={() => setSidebarOpen(true)}
                    onOpenAiPanel={() => setAiPanelOpen(true)}
                    isImpersonating={!!impersonationBanner}
                    productProfile={productProfile}
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
                <div className={`cs-scrollbar flex min-h-0 flex-1 flex-col overflow-auto transition-[padding] duration-200 ${copilotLayoutReserve}`}>
                  {isDispatchFullscreen ? (
                    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col px-2 py-2">{children}</div>
                  ) : (
                    <div
                      className={`mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col px-3 py-4 sm:px-4 sm:py-5 lg:px-7 lg:py-7 ${
                        isFleetUi ? "lg:max-w-[1440px]" : "lg:max-w-[1200px]"
                      }`}
                    >
                      <DemoWelcomePanel
                        headerOrganizationName={isDemoGuest ? tenantName : undefined}
                      />
                      {children}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!isDispatchFullscreen && !isScreenshotMode ? (
              <>
                <div className="fixed bottom-5 right-5 z-40 lg:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setAiPanelOpen(true)}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-operational)] text-white shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-[var(--brand-operational)]/40"
                        aria-label={isFleetUi ? "Fleet Intelligence Copilot" : "Ask Cornerstone"}
                      >
                        <Sparkles className="size-5" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {isFleetUi ? "Fleet Intelligence Copilot" : "Ask Cornerstone"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            ) : null}
            {showCopilot ? (
              <CornerstoneAiPanel
                open={aiPanelOpen || copilotDockedVisible}
                preferExpanded={aiPanelOpen}
                onDockExpandedChange={setCopilotDockExpanded}
                onClose={() => setAiPanelOpen(false)}
                variant={copilotVariant}
                productProfile={productProfile}
              />
            ) : null}
            </FleetCopilotProvider>
          </OperationOptimizationProvider>
        </GetStartedOnboardingProvider>
      </GuidanceProvider>
    </TooltipProvider>
  );
}
