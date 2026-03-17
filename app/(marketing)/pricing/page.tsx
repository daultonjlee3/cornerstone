import type { Metadata } from "next";
import Link from "next/link";
import { SEO, ROUTES, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { PricingCard } from "../../components/marketing";
import { CheckCircle2, XCircle } from "lucide-react";

const seo = SEO[ROUTES.pricing];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.pricing
);

const COMPARISON = [
  { name: "MaintainX", perUser: true },
  { name: "UpKeep", perUser: true },
  { name: "Limble", perUser: true },
  { name: SITE_NAME, perUser: false, highlight: true },
] as const;

const PRICING_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does Cornerstone OS cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cornerstone OS is $75 per technician per month with a $750 monthly platform minimum. Pricing is limited to the first 25 founding customers; you can lock in this rate for life through the Founding Customer Program.",
      },
    },
    {
      "@type": "Question",
      name: "Who is billed for Cornerstone OS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only technicians are billed. Managers, supervisors, dispatchers, office staff, and unlimited office users are included at no additional cost. Unlike many CMMS tools that charge per user, Cornerstone OS bills only for technicians in the field.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in Cornerstone OS pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Work order management, preventive maintenance, asset management, dispatch and scheduling, technician mobile experience, reporting and dashboards, request portal, and support. Office users are unlimited.",
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_FAQ_SCHEMA) }}
      />
      <header className="text-center">
        <h1 className="mk-hero-headline">Simple, transparent pricing</h1>
        <p className="mx-auto mt-6 max-w-2xl mk-subheadline">
          Only technicians are billed. Managers, supervisors, dispatchers, and
          office staff are included at no cost.
        </p>
      </header>

      <section className="mt-14">
        <div className="mx-auto max-w-lg">
          <PricingCard
            price="$75"
            period="/ technician / month"
            minimum="$750 monthly platform minimum"
            description="Pricing is limited to the first 25 founding customers. Lock in this rate for life when you join the Founding Customer Program."
            features={
              <ul className="space-y-4">
                {[
                  "Only technicians are billed",
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
            }
            primaryAction={
              <Link
                href={ROUTES.foundingCustomer}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Claim Founding Customer Pricing
              </Link>
            }
            secondaryAction={
              <p className="mk-caption">
                Or{" "}
                <Link href={ROUTES.signup} className="font-medium text-[var(--accent)] hover:underline">
                  start a free trial
                </Link>
              </p>
            }
          />
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center mk-section-headline">
          How CMMS pricing usually works
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center mk-body-lg">
          Most maintenance software charges per user. Every manager, dispatcher, and office
          staff member adds to the bill. {SITE_NAME} only bills for technicians in the field.
        </p>
        <div className="mt-10 overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[280px] text-left">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                <th className="px-6 py-4 text-sm font-semibold text-[var(--foreground)]">
                  Platform
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[var(--foreground)]">
                  Billing model
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr
                  key={row.name}
                  className={`border-b border-[var(--card-border)] last:border-b-0 ${
                    "highlight" in row && row.highlight ? "bg-[var(--accent)]/5" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                    {row.name}
                  </td>
                  <td className="px-6 py-4">
                    {row.perUser ? (
                      <span className="flex items-center gap-2 text-[var(--muted)]">
                        <XCircle className="h-5 w-5 shrink-0" aria-hidden />
                        Charged per user
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-[var(--accent)] font-medium">
                        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                        Only technicians billed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow-soft)] sm:mt-20 sm:p-8">
        <h2 className="mk-section-headline text-xl">
          Join the first 25 founding customers
        </h2>
        <p className="mx-auto mt-2 max-w-xl mk-body-lg">
          Lock in $75/technician/month for life, influence the roadmap, get priority
          support, and concierge onboarding.
        </p>
        <Link
          href={ROUTES.foundingCustomer}
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Apply for Founding Customer Access
        </Link>
      </section>
    </div>
  );
}
