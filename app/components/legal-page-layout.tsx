import Link from "next/link";
import { ReactNode } from "react";
import {
  FLEET_ROUTES,
  FLEET_SITE_NAME,
} from "@/lib/fleet-marketing-site";
import { FleetMarketingFooter } from "./marketing/fleet/fleet-marketing-footer";
import { FleetMarketingHeader } from "./marketing/fleet/fleet-marketing-header";

type LegalPageLayoutProps = {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  subtitle = FLEET_SITE_NAME,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div
      data-fleet-marketing="true"
      className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      <FleetMarketingHeader />
      <main className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0 mk-section-pattern opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <article className="fm-card rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/80 p-8 sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              Legal
            </p>
            <h1 className="mk-section-headline mt-3">{title}</h1>
            <p className="mt-2 text-lg text-[var(--muted)]">{subtitle}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Last updated: {lastUpdated}</p>
            <div className="mt-10 space-y-10 border-t border-[var(--card-border)] pt-10">
              {children}
            </div>
          </article>
          <p className="mt-8 text-center text-sm text-[var(--muted)]">
            Questions?{" "}
            <a href="mailto:support@cornerstonecmms.com" className="font-medium text-teal-400 hover:text-teal-300">
              support@cornerstonecmms.com
            </a>
            {" · "}
            <Link href={FLEET_ROUTES.requestPilot} className="font-medium text-teal-400 hover:text-teal-300">
              Request Pilot
            </Link>
          </p>
        </div>
      </main>
      <FleetMarketingFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-[var(--muted)] [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul]:pl-5 [&>p+p]:mt-3 [&>a]:font-medium [&>a]:text-teal-400 [&>a]:hover:text-teal-300">
        {children}
      </div>
    </section>
  );
}
