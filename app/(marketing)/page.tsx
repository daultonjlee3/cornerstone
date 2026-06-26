import type { Metadata } from "next";
import Link from "next/link";
import {
  FLEET_ANCHORS,
  FLEET_HERO,
  FLEET_IMPACT_METRICS,
  FLEET_ROUTES,
  FLEET_SEO,
  FLEET_SITE_NAME,
  FLEET_TAGLINE,
  FLEET_TRUST_BADGES,
} from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import {
  FeatureBlock,
  FleetHeroVisual,
  FleetSectionHeader,
  ImplementationTimeline,
  IntegrationGrid,
  OperationalLoopSection,
  OutcomeGrid,
} from "../components/marketing/fleet";
import { CTASection, Section } from "../components/marketing";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Layers,
  Play,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.home.title,
  FLEET_SEO.home.description,
  FLEET_ROUTES.home
);

export default function FleetMarketingHomePage() {
  return (
    <>
      {/* Hero — outcome-driven */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_40%,rgba(45,212,191,0.08),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              {FLEET_HERO.eyebrow}
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--muted)]">{FLEET_TAGLINE}</p>
            <h1 className="mk-hero-headline mt-4">{FLEET_HERO.headline}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
              {FLEET_HERO.subheadline}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={FLEET_ROUTES.contact} className="fm-btn-primary">
                {FLEET_HERO.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href={FLEET_ANCHORS.intelligence} className="fm-btn-secondary">
                <Play className="h-4 w-4" aria-hidden />
                {FLEET_HERO.secondaryCta}
              </Link>
            </div>
            <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
              {FLEET_TRUST_BADGES.map((badge) => (
                <li key={badge} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <FleetHeroVisual />
        </div>
      </section>

      {/* Positioning statement */}
      <Section variant="alt" className="!py-12 md:!py-16">
        <div className="mx-auto max-w-4xl text-center">
          <Layers className="mx-auto h-8 w-8 text-teal-400" aria-hidden />
          <p className="mt-4 text-lg font-medium leading-relaxed text-[var(--foreground)] sm:text-xl">
            We do not replace your ERP, fleet management, telematics, accounting, or dispatch
            software. We become the{" "}
            <span className="text-teal-400">operational intelligence layer</span> that connects
            them together.
          </p>
        </div>
      </Section>

      {/* Business outcomes — not features */}
      <Section id="outcomes">
        <FleetSectionHeader
          eyebrow="Business Outcomes"
          title="Operational intelligence that moves the numbers"
          description="Cornerstone is built around the outcomes industrial fleet operators care about — not another feature checklist."
          centered
        />
        <div className="mt-12 lg:mt-16">
          <OutcomeGrid />
        </div>
      </Section>

      {/* The Operational Loop */}
      <Section id="operational-loop" variant="alt">
        <OperationalLoopSection />
      </Section>

      {/* AI Decision Support */}
      <Section id="intelligence">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <FleetSectionHeader
              eyebrow="AI Decision Support"
              title="Explainable recommendations that protect margin"
              description="Every recommendation is grounded in your operational baseline — utilization, deadhead, job profitability, and on-time performance. Dispatchers see why before they approve."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Reschedule jobs to improve utilization and reduce deadhead",
                "Deploy the closest available unit to protect service levels",
                "Surface contribution impact before you commit to a decision",
                "Explain every recommendation — travel, capacity, GPS, and margin factors",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[var(--muted)]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="fm-card rounded-2xl border border-teal-400/20 bg-[var(--card-solid)]/80 p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Sample Recommendation
            </p>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              Assign PT-1042 to 3:00 PM Houston job — closest unit, lowest deadhead
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Contribution", value: "+$2,450" },
                { label: "Utilization", value: "+2.1 hrs" },
                { label: "Deadhead", value: "-18 mi" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-3 text-center"
                >
                  <p className="text-xs text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-1 text-sm font-bold text-teal-400">{stat.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
              Based on telematics position, dispatch schedule, payroll cost, branch capacity, and
              historical job profitability for this route.
            </p>
          </div>
        </div>
      </Section>

      {/* Fleet Command Center */}
      <Section id="command-center" variant="alt">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1">
            <FleetHeroVisual />
          </div>
          <div className="order-1 lg:order-2">
            <FleetSectionHeader
              eyebrow="Fleet Command Center"
              title="One operational view across your entire fleet"
              description="See utilization, on-time performance, contribution margin, and active recommendations in a single command center built for dispatchers, operations leaders, and fleet owners."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Operational overview with day-over-day performance deltas",
                "Live fleet map with unit positions and route context",
                "Priority recommendation queue with estimated financial impact",
                "Mobile-ready recommendations for field supervisors",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[var(--muted)]">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Integrations preview */}
      <Section id="integrations">
        <FleetSectionHeader
          eyebrow="Integration-First"
          title="Built around the systems you already use"
          description="Connect telematics, ERP, dispatch, payroll, and field service in days — not months. No rip-and-replace required."
          centered
        />
        <div className="mt-10 lg:mt-14">
          <IntegrationGrid />
        </div>
        <div className="mt-10 text-center">
          <Link href={FLEET_ROUTES.integrations} className="fm-btn-secondary">
            View full integration ecosystem
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Section>

      {/* Implementation preview */}
      <Section variant="alt">
        <ImplementationTimeline />
        <div className="mt-10 text-center">
          <Link href={FLEET_ROUTES.implementation} className="inline-flex items-center gap-2 text-sm font-semibold text-teal-400 hover:text-teal-300">
            Learn about Operational Intelligence Launch
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Section>

      {/* Measurable impact */}
      <Section id="impact">
        <FleetSectionHeader
          eyebrow="Operational Impact"
          title="Outcomes you can measure from day one"
          description="Cornerstone turns operational data into action — with results tracked against your baseline."
          centered
        />
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {FLEET_IMPACT_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="fm-card rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-5 text-center sm:p-6"
            >
              <p className="text-2xl font-bold text-teal-400 sm:text-3xl">{metric.value}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{metric.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{metric.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              title: "Reduce deadhead",
              description: "Cut empty miles with smarter routing and job sequencing.",
            },
            {
              icon: Zap,
              title: "Improve utilization",
              description: "Identify idle capacity and redeploy units before margin erodes.",
            },
            {
              icon: Brain,
              title: "Protect contribution",
              description: "See financial impact before committing to operational changes.",
            },
          ].map((item) => (
            <FeatureBlock
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section id="security" variant="alt">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <FleetSectionHeader
            eyebrow="Enterprise Trust"
            title="Enterprise-grade security for operational data"
            description="Your fleet data is sensitive. Cornerstone is built with security, tenant isolation, and reliability as foundational requirements."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Tenant-isolated data architecture",
              "Encrypted data in transit and at rest",
              "Role-based access for operations teams",
              "Audit-ready operational history",
              "Secure API and webhook integrations",
              "No data sold to third parties",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)]/40 p-4"
              >
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                <span className="text-sm text-[var(--muted)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <CTASection
        variant="card"
        title="This isn't another fleet management platform."
        description={`${FLEET_SITE_NAME} is the intelligence layer that sits on top of your business — connecting your systems, recommending the next best action, and protecting margin with every dispatch decision.`}
        actions={
          <>
            <Link href={FLEET_ROUTES.contact} className="fm-btn-primary">
              Request Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={FLEET_ROUTES.integrations} className="fm-btn-secondary">
              See Integrations
            </Link>
          </>
        }
        className="pb-20 lg:pb-28"
      />
    </>
  );
}
