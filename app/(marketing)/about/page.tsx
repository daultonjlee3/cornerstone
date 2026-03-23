import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES, SEO, SITE_NAME, SITE_TAGLINE, buildMarketingMetadata } from "@/lib/marketing-site";
import { CheckCircle2, ArrowRight } from "lucide-react";

const seo = SEO[ROUTES.about];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.about
);

const BUILT_FOR = [
  "Facility and property maintenance companies",
  "Industrial and manufacturing plant operations",
  "School district and campus maintenance teams",
  "Healthcare facility maintenance departments",
];

const PRINCIPLES = [
  {
    title: "Operators first",
    body: "We design for the people who run maintenance every day—dispatchers coordinating field teams, technicians executing work, and operations leaders who need visibility without digging through spreadsheets.",
  },
  {
    title: "One platform, every workflow",
    body: "Work orders, PM, assets, dispatch, inventory, vendors, purchase orders, and reporting all live in one system. No integrations to build, no data silos to reconcile.",
  },
  {
    title: "Pricing that makes sense",
    body: "Straightforward pricing with everything included in one plan, so teams can focus on operations instead of navigating add-ons and seat-based billing complexity.",
  },
  {
    title: "Built to last",
    body: "Cornerstone is being built as a long-term platform for maintenance operations—not a simple ticketing tool or a legacy system in a modern wrapper. We're building what the industry needs next.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-16 sm:px-6 md:py-24">
      {/* Hero */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          About Cornerstone OS
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          The operations system for maintenance teams
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-[var(--muted)]">
          {SITE_TAGLINE}. We&apos;re building a modern CMMS for organizations
          that depend on reliable maintenance management—and need software that
          works for everyone from technicians in the field to leadership in the
          office.
        </p>
      </header>

      {/* Mission */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          What we&apos;re building
        </h2>
        <p className="mt-4 leading-relaxed text-[var(--muted)]">
          {SITE_NAME} brings work orders, preventive maintenance, asset
          management, technician dispatch, inventory, vendor management, purchase
          orders, and operations reporting into one platform. The goal is to
          replace the spreadsheets, whiteboards, and disconnected tools that most
          maintenance teams still rely on—with a connected system that gives the
          entire team visibility and control.
        </p>
        <p className="mt-4 leading-relaxed text-[var(--muted)]">
          We focus on asset-heavy organizations where maintenance isn&apos;t
          optional—teams that manage equipment, facilities, and infrastructure
          that operations depend on. These teams need reliability, not
          complexity.
        </p>
      </section>

      {/* Who we build for */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Who we build for
        </h2>
        <ul className="mt-6 space-y-3">
          {BUILT_FOR.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[var(--muted)]">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Principles */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          How we think about it
        </h2>
        <div className="mt-6 space-y-6">
          {PRINCIPLES.map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6"
            >
              <h3 className="font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h3>
              <p className="mt-2 text-[var(--muted)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          See the platform for yourself
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          Start a free trial and explore {SITE_NAME}—no credit card required. Or
          get in touch and we&apos;ll walk you through it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden />
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
