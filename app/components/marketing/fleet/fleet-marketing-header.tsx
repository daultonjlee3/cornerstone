"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  FLEET_NAV,
  FLEET_ROUTES,
} from "@/lib/fleet-marketing-site";
import { FleetLogo } from "./fleet-logo";

const touchLinkClass =
  "flex min-h-[44px] items-center rounded-lg px-4 py-3 text-[var(--foreground)] hover:bg-white/5 hover:text-[var(--accent)]";

function NavDropdown({
  label,
  children,
}: {
  label: string;
  children: readonly { label: string; href: string }[];
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/5 hover:text-[var(--accent)]"
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <div className="min-w-[220px] rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)] py-2 shadow-xl">
          {children.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-white/5 hover:text-[var(--accent)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FleetMarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <FleetLogo className="min-w-0 shrink" onClick={closeMobile} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavDropdown label={FLEET_NAV.platform.label} children={FLEET_NAV.platform.children} />
          <Link
            href={FLEET_NAV.integrations.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/5 hover:text-[var(--accent)]"
          >
            {FLEET_NAV.integrations.label}
          </Link>
          <Link
            href={FLEET_NAV.implementation.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/5 hover:text-[var(--accent)]"
          >
            {FLEET_NAV.implementation.label}
          </Link>
          <Link
            href={FLEET_NAV.launchEstimator.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-teal-400/90 hover:bg-white/5 hover:text-teal-300"
          >
            {FLEET_NAV.launchEstimator.label}
          </Link>
          <NavDropdown label={FLEET_NAV.company.label} children={FLEET_NAV.company.children} />
        </nav>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href={FLEET_ROUTES.login}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Log in
          </Link>
          <Link
            href={FLEET_ROUTES.requestPilot}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[var(--shadow-glow)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Request Pilot
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-12 min-w-[44px] items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-white/5 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--card-border)] bg-[var(--card-solid)] md:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-6" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Platform
              </span>
              {FLEET_NAV.platform.children.map((item) => (
                <Link key={item.href} href={item.href} className={touchLinkClass} onClick={closeMobile}>
                  {item.label}
                </Link>
              ))}
              <Link
                href={FLEET_NAV.integrations.href}
                className={touchLinkClass}
                onClick={closeMobile}
              >
                Integrations
              </Link>
              <Link
                href={FLEET_NAV.implementation.href}
                className={touchLinkClass}
                onClick={closeMobile}
              >
                Implementation
              </Link>
              <Link
                href={FLEET_NAV.launchEstimator.href}
                className={touchLinkClass}
                onClick={closeMobile}
              >
                Launch Estimator
              </Link>
              <span className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Company
              </span>
              {FLEET_NAV.company.children.map((item) => (
                <Link key={item.href} href={item.href} className={touchLinkClass} onClick={closeMobile}>
                  {item.label}
                </Link>
              ))}
              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--card-border)] pt-6">
                <Link
                  href={FLEET_ROUTES.login}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] font-semibold"
                  onClick={closeMobile}
                >
                  Log in
                </Link>
                <Link
                  href={FLEET_ROUTES.requestPilot}
                  className="flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] font-semibold text-slate-950"
                  onClick={closeMobile}
                >
                  Request Pilot
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
