"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endImpersonation } from "@/app/platform/impersonate/actions";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";
import { DemoWelcomeModal } from "./demo-welcome-modal";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { TourProvider, TourOverlay } from "@/src/components/ui/tour";
import { GuidedTourProvider } from "@/hooks/useGuidedTour";
import { GuidedTour } from "@/components/tour/GuidedTour";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
  showPlatformAdmin?: boolean;
  impersonationBanner?: { actingAsName: string; companyName: string } | null;
  completedTourIds?: string[];
  isDemoGuest?: boolean;
};

export function Shell({
  children,
  tenantName,
  companyName,
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

  return (
    <TooltipProvider>
      <GuidedTourProvider
        autoShow={isDemoGuest && !isScreenshotMode}
        onTourActive={handleTourActive}
      >
        <TourProvider completedTourIds={effectiveCompletedIds}>
          <TourOverlay />
          {!isScreenshotMode && <GuidedTour />}
          {isDemoGuest && !isScreenshotMode && (
            <DemoWelcomeModal isDemoGuest={isDemoGuest} />
          )}
          <div className="flex h-screen overflow-hidden text-[var(--foreground)]">
            {!isDispatchFullscreen ? (
              <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleCollapse}
                showPlatformAdmin={showPlatformAdmin}
                isDemoGuest={isDemoGuest}
              />
            ) : null}
            {/* Main panel: fills remaining width, column layout, scrollable content */}
            <div
              className={`flex min-h-0 flex-1 flex-col ${
                isDispatchFullscreen ? "" : sidebarCollapsed ? "lg:pl-[4.25rem]" : "lg:pl-60"
              }`}
            >
              {!isDispatchFullscreen ? (
                <TopBar
                  tenantName={tenantName}
                  companyName={companyName}
                  onMenuClick={() => setSidebarOpen(true)}
                  isImpersonating={!!impersonationBanner}
                  onReturnToProfile={
                    impersonationBanner ? () => endImpersonation("/dashboard") : undefined
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
                  <div className="mx-auto flex min-h-0 min-w-0 max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TourProvider>
      </GuidedTourProvider>
    </TooltipProvider>
  );
}
