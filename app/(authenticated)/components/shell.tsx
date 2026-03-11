"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
};

export function Shell({ children, tenantName, companyName }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDispatchFullscreen =
    pathname === "/dispatch" && searchParams.get("dispatch_fullscreen") === "1";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {!isDispatchFullscreen ? (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : null}
      {/* Main panel: fills remaining width, column layout, scrollable content */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          isDispatchFullscreen ? "" : "lg:pl-64"
        }`}
      >
        {!isDispatchFullscreen ? (
          <TopBar
            tenantName={tenantName}
            companyName={companyName}
            onMenuClick={() => setSidebarOpen(true)}
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
