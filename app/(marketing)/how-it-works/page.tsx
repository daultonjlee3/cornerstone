import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES, SEO, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { HowItWorksDemoCard } from "../../components/marketing";
import { ArrowRight, FileSearch, Play, Rocket } from "lucide-react";

const seo = SEO[ROUTES.howItWorks];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.howItWorks
);

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          How it works
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Get started with {SITE_NAME} on your terms. Start a free trial, explore the product yourself, or request a demo—whatever fits your workflow.
        </p>
      </header>

      {/* Options */}
      <section className="mt-14 space-y-8">
        <Link
          href={ROUTES.signup}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Rocket className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Start a free trial
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Sign up and get access to the platform. No credit card required. Explore work orders, assets, dispatch, and reporting at your own pace.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
        </Link>
        <HowItWorksDemoCard
          title="See how it works"
          description="Walk through the product with our guides. From request to work order to completion—see how maintenance operations flow in one system."
          iconName="play"
        />
        <Link
          href={ROUTES.signup}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <FileSearch className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Explore the product tour
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Take a self-guided tour inside the app. No demo booking required—jump in and click around.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
        </Link>
      </section>

      {/* Demo optional */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Prefer a live demo?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[var(--muted)]">
          We’re happy to walk you through the platform. Demo booking is optional—many teams start with a free trial and reach out later.
        </p>
        <Link
          href={ROUTES.contact}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Request a demo
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
