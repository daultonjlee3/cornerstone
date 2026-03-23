"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/marketing-site";
import { SeeHowItWorksButton } from "./industry-demo-modal";

type BillingMode = "monthly" | "annual";

type Props = {
  className?: string;
};

export function FoundingPricingCard({ className = "" }: Props) {
  const [billingMode, setBillingMode] = useState<BillingMode>("annual");

  const priceLabel = useMemo(() => {
    if (billingMode === "annual") {
      return "Equivalent to $708/month";
    }
    return "$850/month";
  }, [billingMode]);

  const priceSubtext = billingMode === "annual"
    ? "(billed $8,500/year)"
    : "Up to 20 technicians included";

  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] sm:p-10 ${className}`}
    >
      <div className="text-center">
        <span className="inline-flex items-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--accent)]">
          Founding • Early Customer
        </span>

        <h2 className="mt-5 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Founding Pricing
        </h2>

        <div className="mx-auto mt-6 inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1 shadow-[var(--shadow-soft)]">
          <button
            type="button"
            onClick={() => setBillingMode("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              billingMode === "monthly"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-pressed={billingMode === "monthly"}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingMode("annual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              billingMode === "annual"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-pressed={billingMode === "annual"}
          >
            Annual
          </button>
        </div>

        <p className="mt-8 text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">
          {priceLabel}
        </p>
        <p className="mt-3 text-base text-[var(--muted)] sm:text-lg">{priceSubtext}</p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground)]/80 sm:text-base">
          Everything included. No per-module pricing.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Setup in days, not months
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-5 py-4 text-left shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">
            Get 2 months free with annual billing
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Pay annually: $8,500/year
          </p>
          <p className={`mt-1 text-sm ${billingMode === "annual" ? "text-[var(--accent)] font-medium" : "text-[var(--muted)]"}`}>
            Save $1,700 per year
          </p>
        </div>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Founding pricing available for a limited number of early customers
        </p>

        <p className="mx-auto mt-5 max-w-xl text-sm text-[var(--muted)]">
          Built for facilities teams that need work orders, PM, assets, and dispatch
          without the complexity of legacy systems.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={ROUTES.signup}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]"
          >
            Start Free Trial
          </Link>
          <SeeHowItWorksButton className="w-full min-h-[48px]" variant="secondary">
            View Demo
          </SeeHowItWorksButton>
        </div>
      </div>
    </div>
  );
}
