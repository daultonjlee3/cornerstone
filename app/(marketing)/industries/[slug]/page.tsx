import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  INDUSTRIES,
  ROUTES,
  SEO_INDUSTRIES,
  buildMarketingMetadata,
  type IndustrySlug,
} from "@/lib/marketing-site";
import { INDUSTRY_CONTENT } from "@/lib/industry-content";
import { ScreenshotPlaceholder } from "../../../components/marketing/screenshot-placeholder";
import { ArrowRight, CheckCircle2, Users, Building2 } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

const slugs = new Set(INDUSTRIES.map((i) => i.slug));

export async function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slugs.has(slug as IndustrySlug)) return { title: "Industry | Cornerstone OS" };
  const seo = SEO_INDUSTRIES[slug as IndustrySlug];
  const industry = INDUSTRIES.find((i) => i.slug === slug)!;
  return buildMarketingMetadata(seo.title, seo.description, industry.href);
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  if (!slugs.has(slug as IndustrySlug)) notFound();
  const industry = INDUSTRIES.find((i) => i.slug === slug)!;
  const content = INDUSTRY_CONTENT[slug as IndustrySlug];

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero */}
      <header>
        <h1 className="mk-hero-headline break-words">{industry.title}</h1>
        <p className="mt-4 sm:mt-6 mk-subheadline">
          {content.intro}
        </p>
      </header>

      {/* Screenshot placeholder */}
      <div className="mt-10 w-full sm:mt-12">
        <ScreenshotPlaceholder
          caption={`${industry.title} — platform in use`}
          aspectRatio="wide"
        />
      </div>

      {/* Industry challenges */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Industry challenges
        </h2>
        <ul className="mt-4 space-y-3">
          {content.challenges.map((challenge) => (
            <li key={challenge} className="flex items-start gap-3 text-[var(--muted)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>{challenge}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Maintenance workflow needs */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Maintenance workflow needs
        </h2>
        <ul className="mt-4 space-y-3">
          {content.workflowNeeds.map((need) => (
            <li key={need} className="flex items-start gap-3 text-[var(--muted)]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
              <span>{need}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How Cornerstone improves operations */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          How Cornerstone improves operations
        </h2>
        <p className="mt-4 text-[var(--muted)]">{content.howCornerstoneHelps}</p>
        {content.howBullets && content.howBullets.length > 0 && (
          <ul className="mt-6 space-y-2">
            {content.howBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[var(--muted)]">
                <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Benefits for leadership and technicians */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-2 sm:gap-10">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Benefits for leadership
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {content.benefitsLeadership.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[var(--muted)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Benefits for technicians
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {content.benefitsTechnicians.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[var(--muted)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Secondary screenshot placeholder */}
      <div className="mt-12">
        <ScreenshotPlaceholder
          caption="Operations and reporting"
          aspectRatio="video"
        />
      </div>

      {/* CTA */}
      <section className="mt-16 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Built for {industry.title}
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          One platform for work orders, PM, assets, dispatch, and reporting.
        </p>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Link
            href={ROUTES.signup}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={ROUTES.pricing}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            View pricing
          </Link>
          <Link
            href={ROUTES.contact}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Contact / Demo
          </Link>
        </div>
      </section>
    </article>
  );
}
