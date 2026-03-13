"use client";

import { useState, useRef, useEffect } from "react";
import { SignOutButton } from "@/app/components/sign-out-button";
import { NotificationCenter } from "./notification-center";

type TopBarProps = {
  tenantName: string;
  companyName: string;
  onMenuClick: () => void;
  isImpersonating?: boolean;
  onReturnToProfile?: () => void;
};

export function TopBar({
  tenantName,
  companyName,
  onMenuClick,
  isImpersonating = false,
  onReturnToProfile,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  const initials = `${tenantName.slice(0, 1)}${companyName.slice(0, 1)}`.toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)]/95 px-4 backdrop-blur sm:px-6">
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
            className="ui-input !bg-[var(--background)] py-2 pl-9 pr-3"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationCenter />
        <div className="hidden text-right sm:block">
          <p className="text-xs text-[var(--muted)]">{tenantName}</p>
          <p className="text-xs font-medium text-[var(--foreground)]">{companyName}</p>
        </div>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent)] hover:opacity-90"
            aria-expanded={open}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            {initials}
          </button>
          {open ? (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
              role="menu"
            >
              {isImpersonating && onReturnToProfile ? (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  onClick={() => {
                    setOpen(false);
                    onReturnToProfile();
                  }}
                >
                  Return to My Profile
                </button>
              ) : null}
              <div
                className={
                  isImpersonating && onReturnToProfile
                    ? "border-t border-[var(--card-border)] px-3 py-2"
                    : "px-3 py-2"
                }
              >
                <SignOutButton />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
