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
        headline="Maintenance operations software built for teams that need speed, visibility, and control."
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
            <SeeHowItWorksButton className="w-full sm:w-auto" data-testid="live-demo-cta" />
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

      <section className="mk-section-alt border-t border-[var(--card-border)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
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

      <WorkflowSection
        title="How maintenance operations flow"
        subtitle={`From request to reporting—one continuous loop in ${SITE_NAME}.`}
        steps={[...WORKFLOW_STEPS]}
      />

      <FeatureSection
        variant="alt"
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

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
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

      <section className="mk-section-alt border-t border-[var(--card-border)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
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

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
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

      <section className="mk-section-alt border-t border-[var(--card-border)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-2xl text-center">
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
        description={`Try ${SITE_NAME} yourself. Start a free trial, see how it works, or take a product tour—no demo required.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:w-auto"
            >
              Start Free Trial
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto" />
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:w-auto"
            >
              Explore Product Tour
            </Link>
          </>
        }
      />
    </>
  );
}
