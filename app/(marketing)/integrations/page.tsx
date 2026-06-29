import type { Metadata } from "next";
import Link from "next/link";
import {
  FLEET_INTEGRATIONS_PAGE,
  FLEET_ROUTES,
  FLEET_SEO,
} from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import { IntegrationEcosystem } from "../../components/marketing/fleet";
import { CTASection, Section } from "../../components/marketing";
import { ArrowRight, Clock, Link2, Plug } from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.integrations.title,
  FLEET_SEO.integrations.description,
  FLEET_ROUTES.integrations
);

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(45,212,191,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            Integration-First Platform
          </p>
          <h1 className="mk-hero-headline mt-4">{FLEET_INTEGRATIONS_PAGE.headline}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
            {FLEET_INTEGRATIONS_PAGE.subheadline}
          </p>
        </div>
      </section>

      {/* Integration-first principles */}
      <Section variant="alt" className="!py-12 md:!py-16">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Plug,
              title: "Integration-first",
              body: FLEET_INTEGRATIONS_PAGE.integrationFirst,
            },
            {
              icon: Link2,
              title: "Connect anything",
              body: "API, webhook, database, CSV export, or custom connector — if your platform exposes data, we connect to it.",
            },
            {
              icon: Clock,
              title: "Days, not months",
              body: FLEET_INTEGRATIONS_PAGE.implementationSpeed,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="fm-card rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6"
            >
              <item.icon className="h-6 w-6 text-teal-400" aria-hidden />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Full ecosystem */}
      <Section>
        <IntegrationEcosystem showHeader={false} />
      </Section>

      {/* Architecture callout */}
      <Section variant="alt">
        <div className="mx-auto max-w-4xl">
          <div className="fm-card rounded-2xl border border-teal-400/20 bg-[var(--card-solid)]/80 p-8 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Cornerstone sits on top — not instead of
            </h2>
            <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
              <p>
                Your telematics, ERP, dispatch, payroll, and field service platforms continue
                running exactly as they do today. Cornerstone ingests operational data from each
                system, normalizes it into a unified operational model, and delivers explainable
                recommendations through Fleet Command Center.
              </p>
              <p>
                Approved decisions flow back into your existing workflow. No rip-and-replace. No
                retraining your entire team on new dispatch software. Just smarter decisions,
                faster.
              </p>
            </div>
            {/* Simple architecture diagram */}
            <div className="mt-10 grid gap-3 text-center text-xs font-semibold uppercase tracking-wider sm:grid-cols-5">
              {["Telematics", "ERP / Accounting", "Field Service", "HR / Payroll", "Data & BI"].map(
                (layer) => (
                  <div
                    key={layer}
                    className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-4 text-[var(--muted)]"
                  >
                    {layer}
                  </div>
                )
              )}
            </div>
            <div className="mx-auto mt-3 max-w-md rounded-xl border border-teal-400/30 bg-teal-400/10 px-6 py-4 text-center">
              <p className="text-sm font-bold text-teal-400">Cornerstone Fleet Intelligence</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Operational intelligence & explainable AI</p>
            </div>
            <div className="mx-auto mt-3 max-w-xs rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Fleet Command Center
            </div>
          </div>
        </div>
      </Section>

      <CTASection
        variant="card"
        title="Ready to connect your operational stack?"
        description="Tell us what systems you run today. We'll show you how Cornerstone connects them into one intelligent decision platform."
        actions={
          <>
            <Link href={FLEET_ROUTES.requestPilot} className="fm-btn-primary">
              Request Pilot
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={FLEET_ROUTES.implementation} className="fm-btn-secondary">
              See Implementation Timeline
            </Link>
          </>
        }
        className="pb-20 lg:pb-28"
      />
    </>
  );
}
