"use client";

import { SignOutButton } from "@/app/components/sign-out-button";

type TopBarProps = {
  tenantName: string;
  companyName: string;
  onMenuClick: () => void;
};

export function TopBar({ tenantName, companyName, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)] lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden lg:block" aria-hidden />
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-[var(--muted)] sm:inline" title="Tenant">
          {tenantName}
        </span>
        <span className="hidden text-sm text-[var(--muted)] sm:inline" title="Company">
          | {companyName}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
