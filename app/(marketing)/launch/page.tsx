import type { Metadata } from "next";
import Link from "next/link";
import {
  FLEET_IMPLEMENTATION_PAGE,
  FLEET_ROUTES,
  FLEET_SEO,
  FLEET_SITE_NAME,
} from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import { ImplementationTimeline } from "../../components/marketing/fleet";
import { CTASection, Section } from "../../components/marketing";
import { ArrowRight, CheckCircle2, Layers, Shield } from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.implementation.title,
  FLEET_SEO.implementation.description,
  FLEET_ROUTES.implementation
);

const NOT_THIS = [
  "Multi-month ERP rollout",
  "Rip-and-replace your dispatch software",
  "Retrain your entire team on new tools",
  "Migrate decades of operational history",
];

const IS_THIS = [
  "Connect the systems you already use",
  "Establish an operational baseline in days",
  "Activate explainable AI recommendations",
  "Go live with your existing workflow intact",
];

export default function LaunchPage() {
  return (
    <>
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(45,212,191,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            Operational Intelligence Launch
          </p>
          <h1 className="mk-hero-headline mt-4">{FLEET_IMPLEMENTATION_PAGE.headline}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
            {FLEET_IMPLEMENTATION_PAGE.subheadline}
          </p>
        </div>
      </section>

      <Section variant="alt" className="!py-12 md:!py-16">
        <div className="mx-auto max-w-4xl text-center">
          <Layers className="mx-auto h-8 w-8 text-teal-400" aria-hidden />
          <p className="mt-4 text-lg font-medium leading-relaxed text-[var(--foreground)]">
            {FLEET_IMPLEMENTATION_PAGE.keepExisting}
          </p>
        </div>
      </Section>

      <Section>
        <ImplementationTimeline showHeader={false} centered />
      </Section>

      <Section variant="alt">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">This is not</h2>
            <ul className="mt-6 space-y-3">
              {NOT_THIS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/70" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">This is</h2>
            <ul className="mt-6 space-y-3">
              {IS_THIS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            What goes live on day one
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Shield,
                title: "Operational baseline",
                body: "Utilization, deadhead, margin drivers, branch capacity, and service levels mapped against your current state.",
              },
              {
                icon: Layers,
                title: "Connected data layer",
                body: "Telematics, dispatch, ERP, payroll, and field service data unified into one operational model.",
              },
              {
                icon: CheckCircle2,
                title: "Explainable recommendations",
                body: "AI-powered next-best-action queue in Fleet Command Center with impact estimates on every decision.",
              },
              {
                icon: ArrowRight,
                title: "Continuous improvement loop",
                body: "Measure outcomes, refine recommendations, and improve operational performance over time.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="fm-card rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6"
              >
                <item.icon className="h-5 w-5 text-teal-400" aria-hidden />
                <h3 className="mt-3 font-bold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <CTASection
        variant="card"
        title="Ready to launch operational intelligence?"
        description={`See how ${FLEET_SITE_NAME} connects your systems and delivers explainable recommendations in four weeks — without replacing the software your team already knows.`}
        actions={
          <>
            <Link href={FLEET_ROUTES.requestPilot} className="fm-btn-primary">
              Request Pilot
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={FLEET_ROUTES.integrations} className="fm-btn-secondary">
              View Integrations
            </Link>
            <Link href={FLEET_ROUTES.launchEstimator} className="fm-btn-secondary">
              Launch Estimator
            </Link>
          </>
        }
        className="pb-20 lg:pb-28"
      />
    </>
  );
}
