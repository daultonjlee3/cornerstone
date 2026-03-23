import type { Metadata } from "next";
import Link from "next/link";
import { SEO, ROUTES, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { CheckCircle2, Sparkles } from "lucide-react";
import { FoundingPricingCard } from "../../components/marketing";

const seo = SEO[ROUTES.pricing];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.pricing
);

const PRICING_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does Cornerstone OS cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Founding Pricing is $850/month for up to 20 technicians. With annual billing, you get 2 months free and pay $8,500/year, saving $1,700 annually.",
      },
    },
    {
      "@type": "Question",
      name: "How many technicians are included in Founding Pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Founding Pricing includes up to 20 technicians.",
      },
    },
    {
      "@type": "Question",
      name: "Is Founding Pricing always available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Founding Pricing is available for a limited number of early customers.",
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_FAQ_SCHEMA) }}
      />
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="mk-hero-headline">Founding Pricing</h1>
        <p className="mx-auto mt-6 max-w-2xl mk-subheadline">
          Premium access for early customers who want to modernize maintenance operations
          with Cornerstone.
        </p>
      </header>

      <section className="mt-12 sm:mt-16">
        <FoundingPricingCard />
      </section>

      <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:mt-16 sm:p-8">
        <h2 className="flex items-center justify-center gap-2 text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          What&apos;s included
        </h2>
        <ul className="mt-6 space-y-3">
          {[
            "Up to 20 technicians included",
            "Work orders, preventive maintenance, and asset management",
            "Dispatch, scheduling, and technician mobile workflows",
            "Reporting, dashboards, and request portal",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[var(--foreground)]">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow-soft)] sm:mt-16 sm:p-8">
        <h2 className="mk-section-headline text-xl">
          Founding pricing for early operators
        </h2>
        <p className="mx-auto mt-3 max-w-xl mk-body-lg">
          {SITE_NAME} is opening this plan to a limited number of early customers who
          want priority onboarding and direct product feedback loops.
        </p>
        <div className="mt-6">
          <Link
            href={ROUTES.signup}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
          </Link>
        </div>
      </section>
    </div>
  );
}
