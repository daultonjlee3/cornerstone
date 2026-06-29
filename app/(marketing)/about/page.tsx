import type { Metadata } from "next";
import Link from "next/link";
import { FLEET_ABOUT, FLEET_ROUTES, FLEET_SEO, FLEET_SITE_NAME } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import { CTASection } from "../../components/marketing";
import { ArrowRight, Brain, Layers, Target } from "lucide-react";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.about.title,
  FLEET_SEO.about.description,
  FLEET_ROUTES.about
);

const SECTIONS = [
  { ...FLEET_ABOUT.problem, icon: Target },
  { ...FLEET_ABOUT.dos, icon: Layers },
  { ...FLEET_ABOUT.ai, icon: Brain },
  { ...FLEET_ABOUT.integrations, icon: Layers },
  { ...FLEET_ABOUT.vision, icon: Target },
] as const;

export default function AboutPage() {
  return (
    <>
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            About {FLEET_SITE_NAME}
          </p>
          <h1 className="mk-hero-headline mt-4">{FLEET_ABOUT.headline}</h1>
          <p className="mt-6 text-xl leading-relaxed text-[var(--muted)]">
            {FLEET_ABOUT.subheadline}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-8 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        {SECTIONS.map(({ title, body, icon: Icon }) => (
          <article
            key={title}
            className="fm-card rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
                  {title}
                </h2>
                <p className="mt-4 leading-relaxed text-[var(--muted)]">{body}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <CTASection
        variant="card"
        title="See the Dispatch Operating System in action"
        description="Request a demo and see how Cornerstone connects your operational stack, delivers explainable recommendations, and protects margin with every dispatch decision."
        actions={
          <>
            <Link href={FLEET_ROUTES.requestPilot} className="fm-btn-primary">
              Request Pilot
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={FLEET_ROUTES.integrations} className="fm-btn-secondary">
              View Integrations
            </Link>
          </>
        }
        className="pb-20 lg:pb-28"
      />
    </>
  );
}
