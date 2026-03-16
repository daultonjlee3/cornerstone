import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FEATURES,
  FEATURE_SCREENSHOTS,
  INDUSTRIES,
  ROUTES,
  SEO_FEATURES,
  buildMarketingMetadata,
  type FeatureSlug,
} from "@/lib/marketing-site";
import { FEATURE_CONTENT } from "@/lib/feature-content";
import { Section, ScreenshotContainer } from "../../../components/marketing";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

const slugs = new Set(FEATURES.map((f) => f.slug));

export async function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slugs.has(slug as FeatureSlug)) return { title: "Feature | Cornerstone OS" };
  const seo = SEO_FEATURES[slug as FeatureSlug];
  const feature = FEATURES.find((f) => f.slug === slug)!;
  return buildMarketingMetadata(seo.title, seo.description, feature.href);
}

export default async function FeaturePage({ params }: Props) {
  const { slug } = await params;
  if (!slugs.has(slug as FeatureSlug)) notFound();
  const feature = FEATURES.find((f) => f.slug === slug)!;
  const content = FEATURE_CONTENT[slug as FeatureSlug];

  return (
    <article>
      <Section variant="narrow">
        {/* Hero */}
        <header>
          <h1 className="mk-hero-headline">{feature.title}</h1>
          <p className="mt-6 mk-subheadline">{content.intro}</p>
        </header>

        {/* Main screenshot */}
        <div className="mt-12">
          <ScreenshotContainer
            src={
              FEATURE_SCREENSHOTS[slug as FeatureSlug]
                ? `/marketing/screenshots/${FEATURE_SCREENSHOTS[slug as FeatureSlug]}`
                : undefined
            }
            alt={`${feature.title} — Cornerstone OS`}
            caption={`${feature.title} — product screenshot`}
            aspectRatio="wide"
            width={1200}
            height={675}
          />
        </div>

        {/* Problem */}
        <section className="mt-16">
          <h2 className="mk-section-headline">The problem</h2>
          <p className="mt-4 mk-body-lg">{content.problem}</p>
        {content.problemBullets && content.problemBullets.length > 0 && (
          <ul className="mt-4 space-y-2">
            {content.problemBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[var(--muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

        {/* Workflow */}
        <section className="mt-16">
          <h2 className="mk-section-headline">How it works</h2>
          <p className="mt-4 mk-body-lg">{content.workflow}</p>
        {content.workflowSteps && content.workflowSteps.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {content.workflowSteps.map((step, i) => (
              <span key={step} className="flex items-center gap-3">
                <span className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
                  {step}
                </span>
                {i < content.workflowSteps!.length - 1 && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                )}
              </span>
            ))}
          </div>
        )}
      </section>

        {/* Secondary screenshot */}
        <div className="mt-12">
          <ScreenshotContainer
            src={
              FEATURE_SCREENSHOTS[slug as FeatureSlug]
                ? `/marketing/screenshots/${FEATURE_SCREENSHOTS[slug as FeatureSlug]}`
                : undefined
            }
            alt={`${feature.title} workflow in action`}
            caption="Workflow in action"
            aspectRatio="video"
            width={1200}
            height={675}
          />
        </div>

        {/* Benefits */}
        <section className="mt-16">
          <h2 className="mk-section-headline">Operational benefits</h2>
        <ul className="mt-6 space-y-4">
          {content.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-[var(--foreground)]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Ready to try {feature.title} in one platform?
          </h2>
        <p className="mt-2 text-[var(--muted)]">
          Cornerstone OS brings work orders, assets, dispatch, and reporting together. Built for{" "}
          {INDUSTRIES.slice(0, -1).map((i) => (
            <span key={i.slug}>
              <Link href={i.href} className="font-medium text-[var(--accent)] hover:underline">
                {i.title.toLowerCase()}
              </Link>
              {", "}
            </span>
          ))}
          and{" "}
          <Link href={INDUSTRIES[INDUSTRIES.length - 1].href} className="font-medium text-[var(--accent)] hover:underline">
            {INDUSTRIES[INDUSTRIES.length - 1].title.toLowerCase()}
          </Link>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={ROUTES.pricing}
            className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            View pricing
          </Link>
          <Link
            href="/industries"
            className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Industries
          </Link>
        </div>
        </section>
      </Section>
    </article>
  );
}
