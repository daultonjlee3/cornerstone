import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Brain, Route } from "lucide-react";
import { FLEET_HERO, FLEET_TAGLINE } from "@/lib/fleet-marketing-site";
import { FleetLogo } from "./fleet-logo";

const VALUE_PROPS = [
  {
    icon: Route,
    title: "Reduce Deadhead",
    description: "Cut empty miles with operational intelligence across your entire fleet.",
  },
  {
    icon: BarChart3,
    title: "Improve Utilization",
    description: "Identify idle capacity and redeploy units before margin erodes.",
  },
  {
    icon: Brain,
    title: "Explainable AI",
    description: "Dispatch recommendations with clear impact on margin and service levels.",
  },
] as const;

function FleetAuthBrandPanel() {
  return (
    <div className="relative hidden min-h-0 flex-1 flex-col justify-center overflow-hidden px-8 py-12 lg:flex lg:px-14 xl:px-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_40%,rgba(45,212,191,0.1),transparent_70%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 mk-section-pattern opacity-30" aria-hidden />
      <div className="relative z-10 max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
          {FLEET_HERO.eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white xl:text-4xl">
          {FLEET_TAGLINE}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
          The operational intelligence layer for industrial fleets. Connect your systems, act on
          explainable recommendations, and protect margin with every dispatch decision.
        </p>
        <ul className="mt-10 space-y-6">
          {VALUE_PROPS.map((item) => (
            <li key={item.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <span className="font-semibold text-white">{item.title}</span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-[var(--muted)]/80">
          Integration-first. Live in weeks, not months.
        </p>
      </div>
    </div>
  );
}

type FleetAuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function FleetAuthLayout({ title, subtitle, children, footer }: FleetAuthLayoutProps) {
  return (
    <div
      data-fleet-marketing="true"
      className="flex min-h-screen min-h-[100dvh] flex-col bg-[var(--background)] lg:flex-row"
    >
      <FleetAuthBrandPanel />

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-4 sm:px-6 lg:px-10">
          <FleetLogo compact showText />
          <Link
            href="/"
            className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-teal-400"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-[420px] pb-[env(safe-area-inset-bottom)]">
            <div className="fm-card rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/80 p-8 sm:p-10">
              <div className="mb-8 text-center lg:hidden">
                <FleetLogo className="justify-center" showText />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export const fleetAuthInputClass =
  "w-full min-h-[48px] rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 py-3 pl-11 pr-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/20";

export const fleetAuthLabelClass = "block text-sm font-semibold text-[var(--foreground)]";

export function FleetAuthLegalFooter() {
  return (
    <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
      By continuing, you agree to our{" "}
      <Link href="/terms" className="font-medium text-teal-400 hover:text-teal-300">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="font-medium text-teal-400 hover:text-teal-300">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
