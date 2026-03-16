import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES, SEO, SITE_NAME, SITE_TAGLINE, buildMarketingMetadata } from "@/lib/marketing-site";

const seo = SEO[ROUTES.about];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.about
);

export default function AboutPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      {/* Hero */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
          About {SITE_NAME}
        </h1>
        <p className="mt-6 text-xl text-[var(--muted)]">{SITE_TAGLINE}</p>
      </header>

      {/* Mission */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          What we’re building
        </h2>
        <p className="mt-4 text-[var(--muted)] leading-relaxed">
          {SITE_NAME} is the operations system for maintenance teams. We’re building a modern CMMS
          that brings work orders, preventive maintenance, assets, dispatch, technician workflows,
          and reporting into one platform—so organizations can run maintenance operations with
          speed, visibility, and control.
        </p>
        <p className="mt-4 text-[var(--muted)] leading-relaxed">
          We focus on asset-heavy organizations: facility maintenance companies, industrial and
          manufacturing plants, school districts, healthcare facilities, and others who need
          reliable maintenance management software without the complexity of legacy systems.
        </p>
      </section>

      {/* Values / approach */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Built for real operations
        </h2>
        <p className="mt-4 text-[var(--muted)] leading-relaxed">
          We design for the people who run maintenance every day—dispatchers, technicians, and
          operations leaders. That means clear workflows, mobile-friendly tools, and pricing that
          doesn’t punish you for having managers and office staff in the system. Only technicians
          are billed; everyone else is included.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Get started
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          Try {SITE_NAME} with a free trial or get in touch to learn more.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={ROUTES.signup}
            className="inline-flex rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
          </Link>
          <Link
            href={ROUTES.contact}
            className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
