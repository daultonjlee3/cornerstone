import type { Metadata } from "next";
import Link from "next/link";
import { SEO, ROUTES, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { CheckCircle2, ArrowRight } from "lucide-react";

const seo = SEO[ROUTES.foundingCustomer];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.foundingCustomer
);

const BENEFITS = [
  "Lock in your pricing as an early customer",
  "Direct roadmap influence",
  "Priority feature requests",
  "Early access to new features",
  "Concierge onboarding",
] as const;

export default function FoundingCustomerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Founding Customer Program
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          {SITE_NAME} is opening the platform to the first 25 founding customers.
          Lock in pricing, influence the product, and get white-glove onboarding.
        </p>
      </header>

      {/* Benefits */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Founding customer benefits
        </h2>
        <ul className="mt-6 space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-[var(--foreground)]">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing reminder */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Founding customer pricing
        </h2>
        <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
          $850/month
        </p>
        <p className="mt-1 text-[var(--muted)]">Up to 20 technicians included</p>
        <p className="mt-1 text-[var(--muted)]">Everything included. No per-module pricing.</p>
        <div className="mx-auto mt-5 max-w-md rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-4 py-3">
          <p className="text-sm font-semibold text-[var(--accent)]">Pay annually: $8,500/year</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Get 2 months free</p>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Founding pricing is available for a limited number of early customers.
        </p>
        <Link
          href={ROUTES.pricing}
          className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          View full pricing details →
        </Link>
      </section>

      {/* CTA */}
      <section className="mt-14 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Apply for founding customer access
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[var(--muted)]">
          Limited to the first 25 customers. We’ll reach out to discuss your needs and get you started.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:support@cornerstonecmms.com?subject=Founding%20Customer%20Application"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Apply for Founding Customer Access
            <ArrowRight className="h-5 w-5" aria-hidden />
          </a>
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Start Free Trial
          </Link>
        </div>
      </section>
    </div>
  );
}
