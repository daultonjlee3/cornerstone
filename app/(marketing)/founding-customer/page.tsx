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
  {
    title: "Lifetime locked pricing",
    description: "Lock in $75 per technician per month for as long as you use Cornerstone OS. No surprise increases.",
  },
  {
    title: "Direct roadmap influence",
    description: "Your feedback shapes what we build next. Founding customers have a direct line to product decisions.",
  },
  {
    title: "Priority feature requests",
    description: "Need something specific for your operations? Founding customers get priority consideration for new features.",
  },
  {
    title: "Early access to new features",
    description: "Be the first to use new capabilities before they’re available to everyone.",
  },
  {
    title: "Concierge onboarding",
    description: "Dedicated support to get your team, assets, and workflows set up so you’re productive from day one.",
  },
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
      <section className="mt-14 space-y-6">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6"
          >
            <CheckCircle2 className="h-8 w-8 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                {benefit.title}
              </h2>
              <p className="mt-2 text-[var(--muted)]">{benefit.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing reminder */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Founding customer pricing
        </h2>
        <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
          $75 <span className="text-lg font-normal text-[var(--muted)]">/ technician / month</span>
        </p>
        <p className="mt-1 text-[var(--muted)]">$750 monthly minimum · locked for life</p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Only technicians are billed. Managers, dispatchers, and office staff are included at no cost.
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
