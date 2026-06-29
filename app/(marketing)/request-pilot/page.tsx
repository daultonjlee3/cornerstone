import type { Metadata } from "next";
import Link from "next/link";
import { FLEET_ROUTES, FLEET_SEO, FLEET_SITE_NAME } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import { ArrowRight, Calendar, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.requestPilot.title,
  FLEET_SEO.requestPilot.description,
  FLEET_ROUTES.requestPilot
);

const CONTACT_EMAIL = "support@cornerstonecmms.com";

export default function RequestPilotPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
          Design Partner Program
        </p>
        <h1 className="mk-hero-headline mt-4">Request Pilot</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          {FLEET_SITE_NAME} is available through a design-partner pilot — not self-serve signup.
          Tell us about your fleet and we&apos;ll scope an Operational Intelligence Launch with your
          team.
        </p>
      </header>

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Cornerstone%20Fleet%20Intelligence%20Pilot%20Request`}
          className="fm-card flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6 transition-all hover:border-teal-400/30"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Request Pilot
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Share fleet size, systems in use, and operational priorities.
            </p>
            <p className="mt-3 text-sm font-semibold text-teal-400">{CONTACT_EMAIL}</p>
          </div>
        </a>

        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Schedule%20Operations%20Review%20-%20Cornerstone%20Fleet%20Intelligence`}
          className="fm-card flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6 transition-all hover:border-teal-400/30"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
            <Calendar className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Schedule Operations Review
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Walk through utilization, deadhead, and dispatch workflow with our team.
            </p>
            <p className="mt-3 text-sm font-semibold text-teal-400">{CONTACT_EMAIL}</p>
          </div>
        </a>
      </section>

      <section className="mt-8 fm-card rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6">
        <div className="flex gap-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Request Design Partner Access
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Design partners receive hands-on onboarding, integration mapping, and direct roadmap
              input. Mention &quot;design partner&quot; in your email if you want to explore a deeper
              engagement.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Scope your rollout first?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted)]">
          Use the Launch Estimator to model timeline, integrations, and investment before your pilot
          conversation.
        </p>
        <Link href={FLEET_ROUTES.launchEstimator} className="fm-btn-secondary mt-6">
          Launch Estimator
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <p className="mt-10 text-center text-sm text-[var(--muted)]">
        Already have access?{" "}
        <Link href={FLEET_ROUTES.login} className="font-semibold text-teal-400 hover:text-teal-300">
          Log in
        </Link>
      </p>
    </div>
  );
}
