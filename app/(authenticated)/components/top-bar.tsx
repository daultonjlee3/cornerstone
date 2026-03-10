"use client";

import { SignOutButton } from "@/app/components/sign-out-button";

type TopBarProps = {
  tenantName: string;
  companyName: string;
  onMenuClick: () => void;
};

export function TopBar({ tenantName, companyName, onMenuClick }: TopBarProps) {
  const initials = `${tenantName.slice(0, 1)}${companyName.slice(0, 1)}`.toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 sm:px-6">
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
      <div className="hidden flex-1 px-4 lg:block">
        <label htmlFor="topbar-search" className="sr-only">
          Search
        </label>
        <div className="relative max-w-md">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          </svg>
          <input
            id="topbar-search"
            type="search"
            placeholder="Search work orders, assets, technicians..."
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted)] hover:bg-[var(--background)]/70 hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
          </svg>
        </button>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-[var(--muted)]">{tenantName}</p>
          <p className="text-xs font-medium text-[var(--foreground)]">{companyName}</p>
        </div>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent)]">
          {initials}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
