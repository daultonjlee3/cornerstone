import type { Metadata } from "next";
import Link from "next/link";
import {
  FLEET_ANCHORS,
  FLEET_HERO,
  FLEET_IMPACT_METRICS,
  FLEET_ROUTES,
  FLEET_SEO,
  FLEET_SITE_NAME,
  FLEET_TRUST_BADGES,
} from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import {
  FeatureBlock,
  FleetHeroVisual,
  FleetSectionHeader,
  IntegrationGrid,
} from "../components/marketing/fleet";
import { CTASection, Section } from "../components/marketing";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Link2,
  Play,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.title,
  FLEET_SEO.description,
  FLEET_ROUTES.home
);

const HERO_FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Recommendations",
    description:
      "Get the right recommendation at the right time to maximize margin and efficiency.",
  },
  {
    icon: Link2,
    title: "Connected Everywhere",
    description: "Integrate with your existing systems and telematics in days, not months.",
  },
  {
    icon: BarChart3,
    title: "Operational Intelligence",
    description: "Turn data into actionable insights that improve every part of your operation.",
  },
  {
    icon: Shield,
    title: "Built for Trust and Security",
    description: "Enterprise-grade security and reliability you can count on.",
  },
  {
    icon: CheckCircle2,
    title: "Proven Impact",
    description: "Drive measurable results in utilization, service levels, and profitability.",
  },
] as const;

export default function FleetMarketingHomePage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_40%,rgba(45,212,191,0.07),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              {FLEET_HERO.eyebrow}
            </p>
            <h1 className="mk-hero-headline mt-4">{FLEET_HERO.headline}</h1>
            <p className="mt-5 max-w-xl mk-subheadline">{FLEET_HERO.subheadline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={FLEET_ROUTES.contact} className="fm-btn-primary">
                {FLEET_HERO.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href={FLEET_ANCHORS.commandCenter} className="fm-btn-secondary">
                <Play className="h-4 w-4" aria-hidden />
                {FLEET_HERO.secondaryCta}
              </Link>
            </div>
            <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
              {FLEET_TRUST_BADGES.map((badge) => (
                <li
                  key={badge}
                  className="flex items-center gap-2 text-sm text-[var(--muted)]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <FleetHeroVisual />
        </div>
      </section>

      {/* Hero feature strip */}
      <Section variant="alt" className="!py-10 md:!py-14">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {HERO_FEATURES.map((f) => (
            <FeatureBlock key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
      </Section>

      {/* 2. Integration layer */}
      <Section id="integrations">
        <FleetSectionHeader
          eyebrow="Integration Layer"
          title="Built to connect with the systems you already use"
          description="Cornerstone sits on top of your existing stack — not instead of it. Connect telematics, ERP, dispatch, payroll, and financial systems in days. No rip-and-replace required."
          centered
        />
        <div className="mt-10 lg:mt-14">
          <IntegrationGrid />
        </div>
      </Section>

      {/* 3. AI-powered recommendations */}
      <Section id="recommendations" variant="alt">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <FleetSectionHeader
              eyebrow="Decision Layer"
              title="AI-powered recommendations that protect margin"
              description="Every recommendation is grounded in your operational baseline — utilization, deadhead, job profitability, and on-time performance. Act on what matters, when it matters."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Reschedule jobs to improve utilization and reduce deadhead",
                "Reroute drivers based on real-time fleet position and demand",
                "Deploy the closest available unit to protect service levels",
                "Surface margin impact before you commit to a decision",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[var(--muted)]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="fm-card rounded-2xl border border-teal-400/20 bg-[var(--card-solid)]/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Sample Recommendation
            </p>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              Reschedule 3:00 PM Houston job to tomorrow 7:00 AM
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Margin", value: "+$2,450" },
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
            <p className="mt-4 text-sm text-[var(--muted)]">
              Based on telematics position, dispatch schedule, payroll cost, and historical job
              profitability for this route.
            </p>
          </div>
        </div>
      </Section>

      {/* 4. Fleet Command Center */}
      <Section id="command-center">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
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

      {/* 5. Implementation Center */}
      <Section id="implementation" variant="alt">
        <FleetSectionHeader
          eyebrow="Implementation Center"
          title="Baseline first. Recommendations next. One week to live."
          description="Cornerstone is not a multi-month ERP rollout. Connect your systems, establish an operational baseline, and start receiving actionable recommendations within one week."
          centered
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-14">
          {[
            {
              step: "01",
              title: "Connect your systems",
              description:
                "Link telematics, dispatch, payroll, and financial data through native integrations, REST API, webhooks, or CSV import.",
              icon: Link2,
            },
            {
              step: "02",
              title: "Establish your baseline",
              description:
                "Implementation Center maps your current utilization, deadhead patterns, margin drivers, and service levels before any recommendations go live.",
              icon: ClipboardCheck,
            },
            {
              step: "03",
              title: "Act on recommendations",
              description:
                "AI-powered recommendations surface in Fleet Command Center and mobile — with clear impact estimates so your team can decide with confidence.",
              icon: Zap,
            },
          ].map((phase) => (
            <div
              key={phase.step}
              className="fm-card relative rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6"
            >
              <span className="text-xs font-bold text-teal-400/70">{phase.step}</span>
              <phase.icon className="mt-3 h-6 w-6 text-teal-400" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{phase.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{phase.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Measurable operational impact */}
      <Section id="impact">
        <FleetSectionHeader
          eyebrow="Operational Impact"
          title="Measurable results across utilization, margin, and performance"
          description="Cornerstone turns operational data into action — with outcomes you can track from day one."
          centered
        />
        <div className="mt-10 grid grid-cols-2 gap-4 lg:mt-14 lg:grid-cols-4">
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              title: "Improve utilization",
              description: "Identify idle capacity and redeploy units before margin erodes.",
            },
            {
              icon: Zap,
              title: "Reduce deadhead",
              description: "Cut empty miles with smarter routing and job sequencing.",
            },
            {
              icon: BarChart3,
              title: "Protect contribution margin",
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

      {/* 7. Security and trust */}
      <Section id="security" variant="alt">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <FleetSectionHeader
            eyebrow="Security & Trust"
            title="Enterprise-grade security for operational data"
            description="Your fleet data is sensitive. Cornerstone is built with security, tenant isolation, and reliability as foundational requirements — not afterthoughts."
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

      {/* 8. Final CTA */}
      <CTASection
        variant="card"
        title="Ready to turn operational data into action?"
        description={`See how ${FLEET_SITE_NAME} connects your systems, establishes a baseline, and delivers recommendations that improve utilization and protect margin.`}
        actions={
          <>
            <Link href={FLEET_ROUTES.contact} className="fm-btn-primary">
              Book a Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={FLEET_ANCHORS.commandCenter} className="fm-btn-secondary">
              See the Platform
            </Link>
          </>
        }
        className="pb-16 lg:pb-24"
      />
    </>
  );
}
