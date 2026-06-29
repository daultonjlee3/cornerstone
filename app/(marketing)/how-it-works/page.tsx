import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES, SEO, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { FLEET_ROUTES } from "@/lib/fleet-marketing-site";
import { HowItWorksDemoCard } from "../../components/marketing";
import { ArrowRight, Calculator, Calendar, Rocket } from "lucide-react";

const seo = SEO[ROUTES.howItWorks];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.howItWorks
);

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
          How it works
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          {SITE_NAME} is available through a design-partner pilot. Request access, scope your
          rollout, or schedule an operations review with our team.
        </p>
      </header>

      <section className="mt-14 space-y-8">
        <Link
          href={ROUTES.requestPilot}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Rocket className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Request Pilot
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Apply for a design-partner pilot. We&apos;ll map your systems, operational baseline,
              and rollout timeline with your team.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
        </Link>

        <Link
          href={FLEET_ROUTES.launchEstimator}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Calculator className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Launch Estimator
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Model implementation investment, integrations, and timeline before your pilot
              conversation.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
        </Link>

        <HowItWorksDemoCard
          title="See how it works"
          description="Walk through Fleet Command Center, explainable recommendations, and the operational intelligence loop."
          iconName="play"
        />
      </section>

      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Schedule Operations Review
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[var(--muted)]">
          Prefer a live walkthrough first? We&apos;ll review utilization, deadhead, and dispatch
          workflow with your operations team.
        </p>
        <Link
          href={ROUTES.requestPilot}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Request Pilot
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
