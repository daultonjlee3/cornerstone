"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

type ShellProps = {
  children: React.ReactNode;
  tenantName: string;
  companyName: string;
};

export function Shell({ children, tenantName, companyName }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main panel: fills remaining width, column layout, scrollable content */}
      <div className="flex min-h-0 flex-1 flex-col lg:pl-64">
        <TopBar
          tenantName={tenantName}
          companyName={companyName}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
