import type { Metadata } from "next";
import Link from "next/link";
import {
  CORE_FEATURES_HOME,
  FEATURE_SCREENSHOTS,
  HERO_SCREENSHOTS,
  INDUSTRIES,
  ROUTES,
  SEO,
  SITE_NAME,
  SITE_TAGLINE,
  buildMarketingMetadata,
} from "@/lib/marketing-site";
import {
  CTASection,
  FeatureCard,
  FeatureSection,
  HeroSection,
  IndustryCard,
  PricingCard,
  ScreenshotContainer,
  SeeHowItWorksButton,
  WorkflowSection,
} from "../components/marketing";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const seo = SEO[ROUTES.home];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.home
);

const WORKFLOW_STEPS = [
  "Request",
  "Work Order Creation",
  "Dispatch",
  "Technician Execution",
  "Asset History",
  "Operational Reporting",
] as const;

export default function HomePage() {
  return (
    <>
      <HeroSection
        headline="Maintenance operations software built for teams that run real facilities"
        subheadline="Manage work orders, preventive maintenance, assets, dispatch, technicians, inventory, vendors, purchase orders, and operational reporting in one platform built for modern maintenance teams."
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:w-auto sm:min-h-[48px]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto min-h-[44px] sm:min-h-[48px]" data-testid="live-demo-cta" variant="secondary" />
            <Link
              href={ROUTES.howItWorks}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 text-base font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:w-auto sm:min-h-[48px]"
            >
              See How It Works
            </Link>
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
          src={`/marketing/screenshots/${HERO_SCREENSHOTS.dashboard}`}
          alt="Cornerstone OS operations dashboard"
          caption="Operations dashboard — work orders, assets, and visibility in one place"
          aspectRatio="wide"
          variant="hero"
          width={1600}
          height={900}
        />
      </HeroSection>

      {/* Section 1 — Work Order Command Center: text left, screenshot right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="order-2 min-w-0 md:order-1">
              <h2 className="mk-section-headline">
                Run your entire maintenance operation from one dashboard
              </h2>
              <ul className="mt-6 space-y-3 text-[var(--foreground)] mk-body-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Prioritize work orders across all locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Dispatch technicians instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Track asset service history</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Monitor response times and SLAs</span>
                </li>
              </ul>
            </div>
            <div className="order-1 min-w-0 md:order-2">
              <ScreenshotContainer
                src="/marketing/screenshots/cornerstone-work-orders.png"
                alt="Cornerstone OS work order management dashboard"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <h2 className="mk-section-headline">
            Run maintenance operations from one system
          </h2>
          <p className="mt-4 mk-body-lg">
            {SITE_NAME} unifies work orders, preventive maintenance, asset
            tracking, dispatch, and reporting so your team can move faster with
            full visibility and control—no more spreadsheets or disconnected
            tools.
          </p>
        </div>
      </section>

      {/* Section 2 — Preventive Maintenance: screenshot left, text right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0">
              <ScreenshotContainer
                src="/marketing/screenshots/cornerstone-pm.png"
                alt="Cornerstone OS preventive maintenance schedule"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
            <div className="min-w-0">
              <h2 className="mk-section-headline">
                Prevent failures before they disrupt operations
              </h2>
              <ul className="mt-6 space-y-3 text-[var(--foreground)] mk-body-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Automate recurring maintenance schedules</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Trigger work by calendar, usage, or asset hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Eliminate spreadsheet-based PM tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Keep critical equipment on schedule</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <WorkflowSection
        title="How maintenance operations flow"
        subtitle={`From request to reporting—one continuous loop in ${SITE_NAME}.`}
        steps={[...WORKFLOW_STEPS]}
      />

      {/* Section 3 — Technician Mobile: narrower screenshot to imply mobile */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0 md:order-2">
              <h2 className="mk-section-headline">
                Field teams that actually adopt the software
              </h2>
              <ul className="mt-6 space-y-3 text-[var(--foreground)] mk-body-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Mobile-first technician interface</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Offline-friendly job execution</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Photo documentation and notes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Real-time status updates for dispatch</span>
                </li>
              </ul>
            </div>
            <div className="min-w-0 mx-auto max-w-sm md:order-1 md:mx-0">
              <ScreenshotContainer
                src="/marketing/screenshots/cornerstone-mobile-field.png"
                alt="Cornerstone OS technician mobile interface"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
          </div>
        </div>
      </section>

      <FeatureSection
        variant="default"
        title="Core features"
        subtitle="Everything your team needs to manage maintenance operations in one platform."
      >
        {CORE_FEATURES_HOME.map((feature) => {
          const screenshot = FEATURE_SCREENSHOTS[feature.slug];
          return (
            <FeatureCard key={feature.slug} title={feature.title} href={feature.href}>
              <ScreenshotContainer
                src={screenshot ? `/marketing/screenshots/${screenshot}` : undefined}
                alt={`${feature.title} — Cornerstone OS`}
                caption=""
                aspectRatio="video"
                className="opacity-90"
                width={1200}
                height={675}
              />
            </FeatureCard>
          );
        })}
      </FeatureSection>

      {/* Section 4 — Inventory, Vendors, Purchase Orders: screenshot left, text right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0">
              <ScreenshotContainer
                src="/marketing/screenshots/cornerstone-inventory.png"
                alt="Cornerstone OS inventory and procurement management"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
            <div className="min-w-0">
              <h2 className="mk-section-headline">
                Control inventory, vendors, and purchasing in one system
              </h2>
              <ul className="mt-6 space-y-3 text-[var(--foreground)] mk-body-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Maintain a centralized products catalog</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Track inventory across locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Manage vendor relationships and supplier records</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Create and track purchase orders for maintenance materials</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Maintain purchasing history tied to assets and work orders</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0 px-4 py-16 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center mk-section-headline">
            Only technicians are billed
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center mk-body-lg">
            Managers, supervisors, dispatchers, and office staff are included at
            no cost. Unlimited office users.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              "Technicians — billed per seat",
              "Managers & supervisors — included",
              "Dispatchers — included",
              "Office staff — included",
              "Unlimited office users",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[var(--foreground)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center mk-caption">
            Unlike MaintainX, UpKeep, and Limble—which charge per user—{SITE_NAME}{" "}
            only bills for technicians in the field.
          </p>
        </div>
      </section>

      {/* Section 5 — Operations Intelligence: text above, large centered screenshot */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="text-center">
            <h2 className="mk-section-headline">
              See everything happening across your maintenance operation
            </h2>
            <ul className="mx-auto mt-6 max-w-2xl space-y-3 text-left text-[var(--foreground)] mk-body-lg sm:space-y-2 md:flex md:flex-wrap md:justify-center md:gap-x-8 md:gap-y-2 md:text-center">
              <li className="flex items-start gap-3 md:items-center md:gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5 md:mt-0" aria-hidden />
                <span>Maintenance backlog trends</span>
              </li>
              <li className="flex items-start gap-3 md:items-center md:gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5 md:mt-0" aria-hidden />
                <span>Technician productivity metrics</span>
              </li>
              <li className="flex items-start gap-3 md:items-center md:gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5 md:mt-0" aria-hidden />
                <span>Asset failure patterns</span>
              </li>
              <li className="flex items-start gap-3 md:items-center md:gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5 md:mt-0" aria-hidden />
                <span>Cost visibility across equipment and locations</span>
              </li>
            </ul>
          </div>
          <div className="mt-10 min-w-0">
            <ScreenshotContainer
              src="/marketing/screenshots/cornerstone-reporting.png"
              alt="Cornerstone OS operations intelligence and reporting dashboard"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </section>

      <section className="min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <h2 className="text-center mk-section-headline">
            Built for your industry
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center mk-body-lg px-2 sm:px-0">
            {SITE_TAGLINE}
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {INDUSTRIES.map((industry) => (
              <IndustryCard
                key={industry.slug}
                title={industry.title}
                href={industry.href}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Built for Modern Maintenance Teams — capability tags */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-4xl">
          <h2 className="text-center mk-section-headline">
            Built for Modern Maintenance Teams
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center mk-body-lg">
            A full maintenance operations platform—CMMS, work orders, PM, assets, dispatch, inventory, vendor management, purchase orders, and reporting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10 sm:gap-3">
            {[
              "Work Orders",
              "Preventive Maintenance",
              "Asset Tracking",
              "Technician Dispatch",
              "Vendor Management",
              "Products Catalog",
              "Inventory Tracking",
              "Purchase Orders",
              "Procurement Workflows",
              "Maintenance Reporting",
              "Asset History",
              "Operational Dashboards",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="min-w-0 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <h2 className="mk-section-headline">Founding Customer Program</h2>
          <p className="mt-4 mk-body-lg">
            {SITE_NAME} is opening the platform to the first 25 founding
            customers.
          </p>
          <ul className="mt-10 space-y-3 text-left sm:mx-auto sm:max-w-md">
            {[
              "Lifetime locked pricing",
              "Direct roadmap influence",
              "Priority feature requests",
              "Early access to new features",
              "Concierge onboarding",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[var(--foreground)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.foundingCustomer}
            className="mt-10 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-card)]"
          >
            Apply for Founding Customer Access
          </Link>
        </div>
      </section>

      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-2xl text-center">
          <h2 className="mk-section-headline">Simple, transparent pricing</h2>
          <PricingCard
            price="$75"
            period="per technician / month"
            minimum="$750 monthly minimum"
            description="Only technicians are billed. Office staff and managers are included. Pricing is limited to the first 25 founding customers."
            primaryAction={
              <Link
                href={ROUTES.pricing}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                View full pricing
              </Link>
            }
          />
        </div>
      </section>

      <CTASection
        title="Explore the product"
        description={`Try ${SITE_NAME} yourself. Start a free trial, try the live demo, or see how it works.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:w-auto sm:min-h-[48px]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full min-h-[44px] sm:w-auto sm:min-h-[48px]" data-testid="live-demo-cta-footer" variant="secondary" />
            <Link
              href={ROUTES.howItWorks}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:w-auto sm:min-h-[48px]"
            >
              See How It Works
            </Link>
          </>
        }
      />
    </>
  );
}
