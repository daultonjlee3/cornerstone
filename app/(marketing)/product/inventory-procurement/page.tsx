import type { Metadata } from "next";
import Link from "next/link";
import { CTASection, HeroSection, ScreenshotContainer, Section, SeeHowItWorksButton } from "@/app/components/marketing";
import { ROUTES, SEO, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const path = "/product/inventory-procurement";

const seo: Metadata = buildMarketingMetadata(
  "Inventory & Procurement for Maintenance Teams | Cornerstone OS",
  "Inventory management and maintenance procurement software for CMMS teams. Cornerstone OS brings inventory, vendors, products, and purchase orders into the same maintenance operations platform used for work orders, preventive maintenance, and assets.",
  path
);

export const metadata = seo;

export default function InventoryProcurementPage() {
  return (
    <>
      <HeroSection
        headline="Inventory and procurement for maintenance teams"
        subheadline="Track parts, manage vendors, and create purchase orders in the same platform you use to run maintenance operations."
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] sm:w-auto sm:min-h-[48px]"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto min-h-[44px] sm:min-h-[48px]" />
          </>
        }
      >
        <ScreenshotContainer
          src="/marketing/screenshots/cornerstone-inventory.png"
          alt="Cornerstone OS inventory and procurement management"
          aspectRatio="video"
          variant="hero"
          width={1920}
          height={1080}
        />
      </HeroSection>

      {/* Section 1: Track inventory across locations */}
      <Section variant="alt" className="border-t border-[var(--card-border)]">
        <div className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="min-w-0">
            <h2 className="mk-section-headline">Track inventory across locations</h2>
            <ul className="mt-6 space-y-3 mk-body-lg text-[var(--foreground)]">
              {[
                "Maintain a structured products catalog for maintenance materials.",
                "See inventory balances by location so teams know what’s on hand.",
                "Get low stock visibility before parts become a problem.",
                "Understand material availability for upcoming work orders.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <ScreenshotContainer
              src="/marketing/screenshots/cornerstone-inventory.png"
              alt="Cornerstone OS inventory tracking across locations"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </Section>

      {/* Section 2: Manage vendor relationships */}
      <Section>
        <div className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="order-2 min-w-0 md:order-1">
            <ScreenshotContainer
              src="/marketing/screenshots/cornerstone-vendors.png"
              alt="Cornerstone OS vendor management"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
          <div className="order-1 min-w-0 md:order-2">
            <h2 className="mk-section-headline">Manage vendor relationships</h2>
            <ul className="mt-6 space-y-3 mk-body-lg text-[var(--foreground)]">
              {[
                "Keep vendor records organized for maintenance purchasing.",
                "Store supplier contact details where your team actually works.",
                "See purchasing history by vendor to understand spend.",
                "Organize vendors around how your maintenance team buys materials.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Section 3: Create and track purchase orders */}
      <Section variant="alt">
        <div className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="min-w-0">
            <h2 className="mk-section-headline">Create and track purchase orders</h2>
            <ul className="mt-6 space-y-3 mk-body-lg text-[var(--foreground)]">
              {[
                "Create purchase orders quickly from the maintenance context.",
                "Tie orders to vendors, materials, and the assets they support.",
                "Track PO status from open to received.",
                "Maintain historical purchasing records for audits and analysis.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <ScreenshotContainer
              src="/marketing/screenshots/cornerstone-purchase-orders.png"
              alt="Cornerstone OS purchase order management"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
        </div>
      </Section>

      {/* Section 4: Connect materials to maintenance workflows */}
      <Section>
        <div className="grid min-w-0 grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="order-2 min-w-0 md:order-1">
            <ScreenshotContainer
              src="/marketing/screenshots/cornerstone-work-orders.png"
              alt="Cornerstone OS materials connected to maintenance workflows"
              aspectRatio="video"
              width={1920}
              height={1080}
            />
          </div>
          <div className="order-1 min-w-0 md:order-2">
            <h2 className="mk-section-headline">Connect materials to maintenance workflows</h2>
            <ul className="mt-6 space-y-3 mk-body-lg text-[var(--foreground)]">
              {[
                "Align inventory with work order demand to avoid surprises.",
                "Improve purchasing visibility for operations and finance.",
                "Reduce part shortages that delay maintenance work.",
                "Support better planning by connecting materials to maintenance schedules.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Section 5: Capability summary */}
      <Section variant="alt" className="border-t border-[var(--card-border)]">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <h2 className="mk-section-headline">Inventory and procurement built into maintenance operations</h2>
          <p className="mt-4 mk-body-lg">
            {SITE_NAME} combines CMMS inventory management, vendor management software, and purchase order software
            into one maintenance operations platform—so parts, purchasing, and work orders stay connected.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10 sm:gap-3">
            {[
              "Inventory",
              "Vendors",
              "Products",
              "Purchase Orders",
              "Procurement Workflows",
              "Maintenance Operations",
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
      </Section>

      <CTASection
        title="Bring inventory and purchasing into your maintenance operations"
        description={`Start a free trial of ${SITE_NAME} and see how inventory, vendors, and purchase orders connect directly to work orders and preventive maintenance.`}
        actions={
          <>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:w-auto"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <SeeHowItWorksButton className="w-full sm:w-auto min-h-[44px] sm:min-h-[48px]" />
          </>
        }
      />
    </>
  );
}

