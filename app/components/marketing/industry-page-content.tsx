import Link from "next/link";
import {
  INDUSTRIES,
  INDUSTRY_ROUTE_TO_CONTENT_KEY,
  INDUSTRY_SCREENSHOTS,
  ROUTES,
  SITE_NAME,
  type IndustrySlug,
} from "@/lib/marketing-site";
import { INDUSTRY_CONTENT } from "@/lib/industry-content";
import { ScreenshotContainer } from "./screenshot-container";
import { ArrowRight, CheckCircle2, Users, Building2 } from "lucide-react";

type Props = { industrySlug: IndustrySlug };

export function IndustryPageContent({ industrySlug }: Props) {
  const industry = INDUSTRIES.find((i) => i.slug === industrySlug)!;
  const contentKey = INDUSTRY_ROUTE_TO_CONTENT_KEY[industrySlug];
  const content = INDUSTRY_CONTENT[contentKey];
  const screenshots = INDUSTRY_SCREENSHOTS[industrySlug];

  return (
    <article className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero */}
      <header>
        <h1 className="mk-hero-headline break-words">{content.heroHeadline}</h1>
        <p className="mt-4 sm:mt-6 mk-subheadline">{content.heroSubheading}</p>
      </header>

      {/* Main screenshot (industry-specific) */}
      <div className="mt-10 w-full sm:mt-12">
        <ScreenshotContainer
          src={screenshots.main}
          alt={`${industry.title} — Cornerstone OS platform`}
          caption={`${industry.title} — platform in use`}
          aspectRatio="wide"
          width={1200}
          height={675}
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

      {/* Secondary screenshot (industry-specific) */}
      <div className="mt-12">
        <ScreenshotContainer
          src={screenshots.secondary}
          alt={`${industry.title} — operations and workflow`}
          caption="Operations and workflow"
          aspectRatio="video"
          width={1200}
          height={675}
        />
      </div>

      {/* CTA */}
      <section className="mt-16 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          See {SITE_NAME} in action for {industry.title.toLowerCase()}
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          {content.heroSubheading} Start a free trial or talk to us about your team&apos;s needs.
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
