import type { Metadata } from "next";
import Link from "next/link";
import {
  FEATURES,
  HERO_SCREENSHOTS,
  INDUSTRIES,
  ROUTES,
  SEO,
  SITE_NAME,
  buildMarketingMetadata,
} from "@/lib/marketing-site";
import {
  CTASection,
  FeatureCard,
  FeatureSection,
  HeroSection,
  IndustryCard,
  ScreenshotContainer,
  Section,
  SeeHowItWorksButton,
  WorkflowSection,
} from "../../components/marketing";
import { ArrowRight } from "lucide-react";

const seo = SEO[ROUTES.product];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.product
);

const WORKFLOW_STEPS = [
  "Request Portal",
  "Work Order Creation",
  "Dispatch & Scheduling",
  "Technician Execution",
  "Asset History & Updates",
  "Reporting & Operational Visibility",
] as const;

const CAPABILITY_DESCRIPTIONS: Record<(typeof FEATURES)[number]["slug"], string> = {
  "work-order-management": "Create, assign, track, and complete work orders in one system.",
  "preventive-maintenance": "Schedule recurring maintenance and keep full asset maintenance history.",
  "asset-management": "Track every asset, its history, maintenance activity, and condition in one place.",
  "dispatch-scheduling": "Assign work, schedule technicians, and optimize dispatch from one board.",
  "technician-mobile": "Give technicians mobile access to work orders, updates, and completion in the field.",
  "reporting-dashboards": "Dashboards and reports for operational visibility and leadership insights.",
  "request-portal": "Turn tenant and staff requests into work orders without switching tools.",
  "ai-automation": "Automate work order creation, scheduling, and operational insights.",
};

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        headline="Maintenance operations software built to run your entire workflow."
        subheadline={`${SITE_NAME} brings work orders, preventive maintenance, assets, dispatch, technician workflows, and reporting together in one platform.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:w-auto sm:min-h-[48px]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto" />
          </>
        }
        credibilityStrip={
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-1 sm:gap-y-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]/90 sm:text-xs">
              Built for modern maintenance teams
            </span>
            <span className="hidden text-[var(--muted)]/50 sm:inline" aria-hidden>
              —
            </span>
            <div className="flex flex-col items-center gap-1 text-[11px] text-[var(--muted)]/80 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-0 sm:text-xs">
              <span>Facility Maintenance Companies</span>
              <span className="hidden text-[var(--muted)]/40 sm:inline" aria-hidden>
                ·
              </span>
              <span>Industrial Operations</span>
              <span className="hidden text-[var(--muted)]/40 sm:inline" aria-hidden>
                ·
              </span>
              <span>School Districts</span>
              <span className="hidden text-[var(--muted)]/40 sm:inline" aria-hidden>
                ·
              </span>
              <span>Healthcare Facilities</span>
            </div>
          </div>
        }
      >
        <ScreenshotContainer
          src={HERO_SCREENSHOTS.dashboard}
          alt="Cornerstone OS product overview — operations dashboard"
          caption="One platform for work orders, PM, assets, dispatch, and reporting"
          aspectRatio="wide"
          variant="hero"
          width={1920}
          height={1080}
        />
      </HeroSection>

      {/* Section 1: The operations system for maintenance teams */}
      <Section variant="alt" className="border-t border-[var(--card-border)]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            The operations system for maintenance teams
          </p>
          <h2 className="mt-4 mk-section-headline">
            Run your entire maintenance operation from one platform.
          </h2>
          <p className="mt-6 mk-body-lg">
            {SITE_NAME} is designed to manage the full lifecycle of maintenance work. Most teams
            struggle with disconnected tools and limited visibility—Cornerstone connects requests,
            work orders, technicians, and asset history into one system so you can run operations
            with speed and control.
          </p>
        </div>
      </Section>

      {/* Section 2: The maintenance operations workflow */}
      <WorkflowSection
        title="The maintenance operations workflow"
        subtitle="From request to reporting—one continuous loop in the platform."
        steps={[...WORKFLOW_STEPS]}
      />

      {/* Section 3: Core platform capabilities */}
      <FeatureSection
        variant="alt"
        title="Core platform capabilities"
        subtitle="The system modules that power maintenance operations from request to reporting."
      >
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.slug} title={feature.title} href={feature.href}>
            <p className="text-sm text-[var(--muted)]">
              {CAPABILITY_DESCRIPTIONS[feature.slug]}
            </p>
          </FeatureCard>
        ))}
      </FeatureSection>

      {/* Section 4: Work order management */}
      <Section>
        <div className="grid grid-cols-1 min-w-0 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h2 className="mk-section-headline">
              Powerful work order management for real operations.
            </h2>
            <p className="mt-6 mk-body-lg">
              Create, assign, track, and complete work orders in one place. From request to
              closure—status, priority, assignments, and history stay visible so dispatchers and
              technicians always know what’s next.
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-soft)]">
            <ScreenshotContainer
              src="/screenshots/work-orders.png"
              alt="Work order management — create, assign, track, and complete"
              caption="Work order management"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </Section>

      {/* Section 5: Preventive maintenance */}
      <Section variant="alt">
        <div className="grid grid-cols-1 min-w-0 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 min-w-0 lg:order-1 overflow-hidden rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-soft)]">
            <ScreenshotContainer
              src="/screenshots/preventive-maintenance.png"
              alt="Preventive maintenance — schedules and asset history"
              caption="Preventive maintenance"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <h2 className="mk-section-headline">
              Automate preventive maintenance schedules.
            </h2>
            <p className="mt-6 mk-body-lg">
              Set recurring maintenance by asset, template, or calendar. Keep full asset
              maintenance history and compliance in one place so nothing slips through the cracks.
            </p>
          </div>
        </div>
      </Section>

      {/* Section 6: Asset management */}
      <Section>
        <div className="grid grid-cols-1 min-w-0 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h2 className="mk-section-headline">
              Complete asset visibility.
            </h2>
            <p className="mt-6 mk-body-lg">
              Track every asset, its location, maintenance history, and condition. See what’s been
              serviced, what’s due, and how assets are performing so you can prioritize work and
              plan ahead.
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-soft)]">
            <ScreenshotContainer
              src="/screenshots/assets.png"
              alt="Asset management — track assets, history, and condition"
              caption="Asset management"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </Section>

      {/* Section 7: Dispatch & technician workflows */}
      <Section variant="alt">
        <div className="grid grid-cols-1 min-w-0 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 min-w-0 lg:order-1 overflow-hidden rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-soft)]">
            <ScreenshotContainer
              src="/screenshots/dispatch.png"
              alt="Dispatch and technician workflows — assign and schedule work"
              caption="Dispatch and technician workflows"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <h2 className="mk-section-headline">
              Coordinate work and empower technicians.
            </h2>
            <p className="mt-6 mk-body-lg">
              Use dispatch boards to assign and schedule work. Give technicians a clear queue,
              mobile access, and simple completion flows so work gets done in the field and
              updates flow back in real time.
            </p>
          </div>
        </div>
      </Section>

      {/* Section 8: Reporting & operational visibility */}
      <Section>
        <div className="grid grid-cols-1 min-w-0 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h2 className="mk-section-headline">
              Custom reporting built around how your business runs.
            </h2>
            <p className="mt-6 mk-body-lg">
              Every maintenance team operates differently. Cornerstone OS lets you build dashboards and reports around the metrics that matter most—work order performance, preventive maintenance compliance, asset health, and technician productivity—so leadership always has clear operational visibility.
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-soft)]">
            <ScreenshotContainer
              src="/screenshots/operations-dashboard.png"
              alt="Reporting and operational visibility — dashboards and insights"
              caption="Reporting and dashboards"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </Section>

      {/* Section 9: Built for real maintenance teams */}
      <Section variant="alt" className="border-t border-[var(--card-border)]">
        <div className="text-center">
          <h2 className="mk-section-headline">Built for real maintenance teams</h2>
          <p className="mx-auto mt-4 max-w-2xl mk-body-lg">
            {SITE_NAME} serves facility maintenance, industrial operations, school districts, and
            healthcare—teams that need one platform for work orders, PM, assets, and reporting.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {INDUSTRIES.map((industry) => (
              <IndustryCard
                key={industry.slug}
                title={industry.title}
                href={industry.href}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Section 10: Pricing simplicity */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mk-section-headline">Simple technician-based pricing</h2>
          <p className="mt-6 mk-body-lg">
            {SITE_NAME} only charges for technicians. Managers, supervisors, dispatchers, and office
            staff are included at no extra cost—so you can run your full team in one platform
            without per-seat surprises.
          </p>
          <div className="mt-10 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
            <p className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              $75 per technician <span className="text-[var(--muted)] font-normal">/ month</span>
            </p>
            <p className="mt-2 text-[var(--muted)]">$750 monthly platform minimum</p>
            <p className="mt-6 text-sm text-[var(--muted)]">
              The first 25 teams can lock in founding customer pricing and benefits.
            </p>
            <Link
              href={ROUTES.pricing}
              className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <CTASection
        title="Ready to modernize your maintenance operations?"
        description={`Start a free trial or explore how ${SITE_NAME} works—no demo required.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:w-auto"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto">
              Explore How It Works
            </SeeHowItWorksButton>
          </>
        }
      />
    </>
  );
}
