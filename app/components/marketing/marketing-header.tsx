"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
import { NAV, ROUTES, SITE_NAME } from "@/lib/marketing-site";
import { SeeHowItWorksButton } from "./industry-demo-modal";
import { ChevronDown, Menu, X } from "lucide-react";

const touchLinkClass =
  "flex min-h-[44px] items-center justify-between rounded-lg px-4 py-3 text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)] active:bg-[var(--background)]";

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.home}
          className="flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight text-[var(--foreground)] transition-opacity hover:opacity-90"
          onClick={closeMobile}
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span>{SITE_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
            >
              {NAV.product.label}
              <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
            </button>
            <div className="invisible absolute left-0 top-full pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="min-w-[220px] rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)] py-2 shadow-lg">
                {NAV.product.children.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
            >
              {NAV.industries.label}
              <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
            </button>
            <div className="invisible absolute left-0 top-full pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="min-w-[260px] rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)] py-2 shadow-lg">
                {NAV.industries.children.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={NAV.pricing.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
          >
            {NAV.pricing.label}
          </Link>
          <Link
            href={NAV.foundingCustomer.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
          >
            {NAV.foundingCustomer.label}
          </Link>
          <SeeHowItWorksButton
            className="rounded-md px-3 py-2 text-sm font-medium min-h-0 sm:min-h-0"
          >
            {NAV.howItWorks.label}
          </SeeHowItWorksButton>
          <Link
            href={NAV.about.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
          >
            {NAV.about.label}
          </Link>
          <Link
            href={NAV.contact.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
          >
            {NAV.contact.label}
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href={ROUTES.signup}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
          </Link>
          <Link
            href={ROUTES.login}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile: hamburger + CTAs */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href={ROUTES.signup}
            className="rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white min-h-[44px] inline-flex items-center justify-center"
          >
            Start Free Trial
          </Link>
          <Link
            href={ROUTES.login}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] min-h-[44px] inline-flex items-center justify-center"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--background)]"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div
          className="border-t border-[var(--card-border)] bg-[var(--card)] md:hidden"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6" aria-label="Main">
            <div className="flex flex-col gap-1">
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Product
              </span>
              {NAV.product.children.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={touchLinkClass}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))}
              <span className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Industries
              </span>
              {NAV.industries.children.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={touchLinkClass}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))}
              <span className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Company
              </span>
              <Link href={NAV.pricing.href} className={touchLinkClass} onClick={closeMobile}>
                Pricing
              </Link>
              <Link href={NAV.foundingCustomer.href} className={touchLinkClass} onClick={closeMobile}>
                Founding Customer
              </Link>
              <SeeHowItWorksButton
                className={touchLinkClass}
                variant="secondary"
                onClick={closeMobile}
              >
                How It Works
              </SeeHowItWorksButton>
              <Link href={NAV.about.href} className={touchLinkClass} onClick={closeMobile}>
                About
              </Link>
              <Link href={NAV.contact.href} className={touchLinkClass} onClick={closeMobile}>
                Contact
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
