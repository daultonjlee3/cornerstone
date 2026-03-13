"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endImpersonation } from "@/app/platform/impersonate/actions";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
  showPlatformAdmin?: boolean;
  impersonationBanner?: { actingAsName: string; companyName: string } | null;
};

export function Shell({
  children,
  tenantName,
  companyName,
  showPlatformAdmin = false,
  impersonationBanner = null,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDispatchFullscreen =
    pathname === "/dispatch" && searchParams.get("dispatch_fullscreen") === "1";

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setSidebarCollapsed(stored === "1");
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {!isDispatchFullscreen ? (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          showPlatformAdmin={showPlatformAdmin}
        />
      ) : null}
      {/* Main panel: fills remaining width, column layout, scrollable content */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          isDispatchFullscreen ? "" : sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
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
        <div className="min-h-0 flex-1 overflow-auto">
          {isDispatchFullscreen ? (
            <div className="h-full px-2 py-2">{children}</div>
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
