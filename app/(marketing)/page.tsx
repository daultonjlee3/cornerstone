import type { Metadata } from "next";
import Link from "next/link";
import {
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
  FoundingPricingCard,
  HeroSection,
  IndustryCard,
  ScreenshotContainer,
  SeeHowItWorksButton,
  WorkflowSection,
} from "../components/marketing";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Layers,
  Package,
  Receipt,
  Repeat,
  Settings2,
  Smartphone,
  Users2,
} from "lucide-react";

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

const OPERATIONS_PLATFORM_FEATURES = [
  {
    title: "Work Order Management",
    description:
      "Create, assign, and close work orders with full status tracking and asset history.",
    href: "/features/work-order-management",
    Icon: ClipboardList,
  },
  {
    title: "Preventive Maintenance",
    description: "Automate recurring schedules and keep compliance records out of spreadsheets.",
    href: "/features/preventive-maintenance",
    Icon: Repeat,
  },
  {
    title: "Asset Management",
    description: "Track every asset, maintenance history, and condition in one place.",
    href: "/features/asset-management",
    Icon: Boxes,
  },
  {
    title: "Dispatch & Scheduling",
    description:
      "Assign work to technicians by skill, location, or load and keep the board live.",
    href: "/features/dispatch-scheduling",
    Icon: CalendarClock,
  },
  {
    title: "Technician Mobile App",
    description: "Technicians see their queue, update status, add photos, and close work from the field.",
    href: "/features/technician-mobile",
    Icon: Smartphone,
  },
  {
    title: "Inventory Management",
    description: "Track parts, quantities, and stock locations across warehouses, properties, and trucks.",
    href: ROUTES.productInventoryProcurement,
    Icon: Package,
  },
  {
    title: "Vendor Management",
    description: "Manage vendors, track performance, and tie them directly to work orders and purchasing.",
    href: ROUTES.productInventoryProcurement,
    Icon: Building2,
  },
  {
    title: "Purchase Orders",
    description: "Create and track POs, manage approvals, and keep spend aligned with maintenance operations.",
    href: ROUTES.productInventoryProcurement,
    Icon: Receipt,
  },
  {
    title: "Reporting & Dashboards",
    description: "Real-time dashboards for backlog, labor, PM compliance, and asset performance.",
    href: "/features/reporting-dashboards",
    Icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <>
      <HeroSection
        headline="Maintenance operations software built for teams that run real facilities"
        subheadline="Most maintenance teams manage work across too many disconnected systems. Cornerstone brings work orders, PM, assets, dispatch, inventory, and operations intelligence into one platform—so your team runs operations instead of chasing information."
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
          src={HERO_SCREENSHOTS.dashboard}
          alt="Cornerstone OS operations dashboard"
          caption="Operations dashboard — work orders, assets, and visibility in one place"
          aspectRatio="wide"
          variant="hero"
          width={1920}
          height={1080}
        />
      </HeroSection>

      {/* Section 1 — Work Order Command Center: text left, screenshot right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="order-2 min-w-0 md:order-1">
              <h2 className="mk-section-headline">
                Every open job, overdue task, and urgent alert—visible in one place
              </h2>
              <p className="mt-4 mk-body-lg">
                Stop checking multiple tools to understand your operation. The Cornerstone
                command center gives dispatchers and operations leaders real-time visibility
                into open work, overdue jobs, technician activity, and upcoming PM—so you can
                act before problems escalate.
              </p>
              <ul className="mt-6 space-y-3 text-[var(--foreground)] mk-body-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Prioritize work orders across all locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Dispatch technicians instantly from the same interface</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Track asset service history tied to every job</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden />
                  <span>Monitor response times and operational KPIs</span>
                </li>
              </ul>
            </div>
            <div className="order-1 min-w-0 md:order-2">
              <ScreenshotContainer
                src="/screenshots/work-orders.png"
                alt="Cornerstone OS work order management dashboard"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Platform depth strip */}
      <section className="min-w-0 border-t border-[var(--card-border)] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            {[
              {
                Icon: Layers,
                stat: "9 modules",
                label: "One platform from requests to reporting",
              },
              {
                Icon: Users2,
                stat: "Every role",
                label: "Technicians, dispatchers, and leadership in one system",
              },
              {
                Icon: Cloud,
                stat: "Cloud-hosted",
                label: "No servers to manage. Up and running in days.",
              },
              {
                Icon: Settings2,
                stat: "Full lifecycle",
                label: "Work orders, PM, assets, inventory, and analytics connected",
              },
            ].map(({ Icon, stat, label }) => (
              <div key={stat} className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight text-[var(--foreground)]">
                  {stat}
                </p>
                <p className="text-sm text-[var(--muted)] leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Preventive Maintenance: screenshot left, text right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0">
              <ScreenshotContainer
                src="/screenshots/preventive-maintenance.png"
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

      {/* Section 3 — Technician Mobile: optimized technician work queue screenshot */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0">
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
            <div className="min-w-0 mx-auto max-w-md md:max-w-xl md:mx-0">
              <ScreenshotContainer
                src="/screenshots/technician-mobile.png"
                alt="Cornerstone OS technician work queue and mobile interface"
                aspectRatio="video"
                width={1920}
                height={1080}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section — Operations Platform Features (text-first, no screenshots) */}
      <section className="min-w-0 px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="text-center">
            <h2 className="mk-section-headline">The operating system for maintenance teams</h2>
            <p className="mx-auto mt-4 max-w-2xl mk-body-lg">
              Manage work orders, assets, technicians, inventory, vendors, and purchasing in one unified platform.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:gap-10">
            {OPERATIONS_PLATFORM_FEATURES.map(({ title, description, href, Icon }) => (
              <article
                key={title}
                className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/15">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                      {description}
                    </p>

                    <Link
                      href={href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex justify-center sm:mt-12">
            <Link
              href={ROUTES.product}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:min-h-[48px]"
            >
              Explore the full platform
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4 — Inventory, Vendors, Purchase Orders: screenshot left, text right */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="min-w-0">
              <ScreenshotContainer
                src="/screenshots/inventory.png"
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
            Simple pricing for operations teams
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center mk-body-lg">
            Founding Pricing is designed to be straightforward: one monthly rate,
            up to 20 technicians included, and every core module in one plan.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              "$850/month",
              "Up to 20 technicians included",
              "Everything included. No per-module pricing.",
              "Pay annually: $8,500/year",
              "Get 2 months free",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[var(--foreground)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
              src="/screenshots/operations-dashboard.png"
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

      {/* Platform trust section */}
      <section className="mk-section-alt min-w-0 border-t border-[var(--card-border)] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="text-center">
            <h2 className="mk-section-headline">
              Designed for teams that run real operations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl mk-body-lg">
              Built with input from maintenance professionals across facility management,
              industrial operations, education, and healthcare—organizations that manage
              hundreds of assets and need software that works for the whole team.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Every role, one platform",
                body: "Technicians, dispatchers, supervisors, and leadership all work in the same system—no separate apps, no manual syncing.",
              },
              {
                title: "Role-based access",
                body: "Control what each person sees and does. Assign roles, set permissions, and keep sensitive data where it belongs.",
              },
              {
                title: "Cloud-hosted security",
                body: "No servers to manage. Enterprise-grade infrastructure, data encrypted in transit and at rest, and role-controlled access.",
              },
              {
                title: "Quick to implement",
                body: "Pre-built workflows and templates get your team running in days—not the weeks or months typical of legacy CMMS platforms.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]"
              >
                <h3 className="font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{body}</p>
              </div>
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
              "Lock in your pricing as an early customer",
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
          <FoundingPricingCard />
          <Link
            href={ROUTES.pricing}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            View full pricing details
          </Link>
        </div>
      </section>

      <CTASection
        title="Ready to run better maintenance operations?"
        description={`Start a free trial or talk to us about your team's needs. ${SITE_NAME} is free to try—no credit card required.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:w-auto sm:min-h-[48px]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href={ROUTES.contact}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:w-auto sm:min-h-[48px]"
            >
              Talk to us
            </Link>
          </>
        }
      />
    </>
  );
}
