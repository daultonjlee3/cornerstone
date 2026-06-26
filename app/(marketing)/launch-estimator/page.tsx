import type { Metadata } from "next";
import { LaunchEstimatorWizard } from "../../components/marketing/fleet/launch-estimator";
import { FLEET_ROUTES, FLEET_SEO } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";

export const metadata: Metadata = buildMarketingMetadata(
  FLEET_SEO.launchEstimator.title,
  FLEET_SEO.launchEstimator.description,
  FLEET_ROUTES.launchEstimator
);

export default function LaunchEstimatorPage() {
  return (
    <>
      <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(45,212,191,0.1),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            Implementation Scoping Tool
          </p>
          <h1 className="mk-hero-headline mt-4">Fleet Intelligence Launch Estimator</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Scope your rollout in minutes — estimated investment, timeline, integrations, and
            operational focus areas. Built for fleet operators planning an intelligence layer, not
            replacing their stack.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <LaunchEstimatorWizard />
      </section>
    </>
  );
}
