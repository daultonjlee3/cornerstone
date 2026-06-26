import type { Metadata } from "next";
import Link from "next/link";
import { FLEET_ROUTES, FLEET_SEO, FLEET_SITE_NAME } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import { ArrowRight, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.contact.title,
  FLEET_SEO.contact.description,
  FLEET_ROUTES.contact
);

const CONTACT_EMAIL = "support@cornerstonecmms.com";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
          Request Demo
        </p>
        <h1 className="mk-hero-headline mt-4">See Fleet Intelligence in action</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          Request a demo of {FLEET_SITE_NAME}. We&apos;ll walk you through how operational
          intelligence and explainable AI improve dispatch decisions for industrial fleets — without
          replacing the systems you already use.
        </p>
      </header>

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Cornerstone%20Fleet%20Intelligence%20Demo%20Request`}
          className="fm-card flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6 transition-all hover:border-teal-400/30"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Email us
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tell us about your fleet, systems, and operational challenges.
            </p>
            <p className="mt-3 text-sm font-semibold text-teal-400">{CONTACT_EMAIL}</p>
          </div>
        </a>

        <div className="fm-card flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              What to expect
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>• Live walkthrough of Fleet Command Center</li>
              <li>• Integration mapping for your stack</li>
              <li>• Operational Intelligence Launch timeline</li>
              <li>• Sample recommendations with impact estimates</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Integration questions?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted)]">
          Don&apos;t see your software on our integrations page? We&apos;ll build the connector.
          Mention your platforms when you reach out.
        </p>
        <Link href={FLEET_ROUTES.integrations} className="fm-btn-secondary mt-6">
          View Integration Ecosystem
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
