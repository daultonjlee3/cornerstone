import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES, ROUTES, SEO, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { ArrowRight, Building2, Factory, GraduationCap, Heart } from "lucide-react";

const seo = SEO["/industries"];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  "/industries"
);

const INDUSTRY_META: Record<
  string,
  { icon: React.ElementType; description: string }
> = {
  "facility-maintenance-software": {
    icon: Building2,
    description:
      "Work orders, asset tracking, preventive maintenance, and technician dispatch for commercial and residential facility teams managing multiple locations.",
  },
  "industrial-maintenance-software": {
    icon: Factory,
    description:
      "PM schedules, equipment uptime tracking, and production-floor maintenance for industrial operations that can't afford unexpected downtime.",
  },
  "school-maintenance-software": {
    icon: GraduationCap,
    description:
      "Maintenance operations for campuses, buildings, and district facilities—keeping schools running without the complexity of legacy CMMS systems.",
  },
  "healthcare-maintenance-software": {
    icon: Heart,
    description:
      "Compliance-ready maintenance workflows for hospitals, clinics, and healthcare facilities that require full audit trails and regulated service records.",
  },
};

const PLATFORM_CAPABILITIES = [
  "Work Orders",
  "Preventive Maintenance",
  "Asset Management",
  "Technician Dispatch",
  "Inventory Management",
  "Vendor Management",
  "Purchase Orders",
  "Operations Intelligence",
  "Request Portal",
];

export default function IndustriesIndexPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      {/* Hero */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Industries served
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Built for your industry
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          {SITE_NAME} serves maintenance and operations teams across facility
          management, industrial operations, education, and healthcare—organizations
          that depend on reliable, connected maintenance software to keep operations
          running.
        </p>
      </header>

      {/* Industry cards */}
      <section className="mt-14 grid gap-6 sm:grid-cols-2" aria-label="Industries">
        {INDUSTRIES.map((industry) => {
          const meta = INDUSTRY_META[industry.slug];
          const Icon = meta?.icon ?? Building2;
          return (
            <Link
              key={industry.slug}
              href={industry.href}
              className="group flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-7 shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--accent)]/60 hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                {industry.title}
              </h2>
              <p className="mt-3 flex-1 leading-relaxed text-[var(--muted)]">
                {meta?.description ?? ""}
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
                See how it works
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Platform scope */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          One platform across all industries
        </h2>
        <p className="mt-3 text-[var(--muted)]">
          Regardless of your industry, Cornerstone covers the full maintenance
          operations workflow in one connected system—no spreadsheets, no
          disconnected tools, no patchwork of apps.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORM_CAPABILITIES.map((cap) => (
            <span
              key={cap}
              className="rounded-full border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]"
            >
              {cap}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={ROUTES.product}
            className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Product overview
          </Link>
        </div>
      </section>
    </div>
  );
}
