import Link from "next/link";
import {
  FLEET_ANCHORS,
  FLEET_INTEGRATIONS,
  FLEET_ROUTES,
  FLEET_SITE_NAME,
  FLEET_TAGLINE,
} from "@/lib/fleet-marketing-site";
import { FleetLogo } from "./fleet-logo";

const linkClass = "text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]";

const platformLinks = [
  { label: "AI Recommendations", href: FLEET_ANCHORS.recommendations },
  { label: "Fleet Command Center", href: FLEET_ANCHORS.commandCenter },
  { label: "Implementation Center", href: FLEET_ANCHORS.implementation },
  { label: "Operational Impact", href: FLEET_ANCHORS.impact },
  { label: "Security & Trust", href: FLEET_ANCHORS.security },
];

export function FleetMarketingFooter() {
  return (
    <footer className="border-t border-[var(--card-border)] bg-[var(--card-solid)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <FleetLogo showText />
            <p className="mt-3 text-sm text-[var(--muted)]">{FLEET_TAGLINE}</p>
            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]/80">
              Operational intelligence for industrial fleets. Connect your systems, establish a
              baseline, and act on recommendations that protect margin and performance.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Platform
            </h3>
            <ul className="mt-4 space-y-3">
              {platformLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Integrations
            </h3>
            <ul className="mt-4 space-y-3">
              {FLEET_INTEGRATIONS.slice(0, 5).map((item) => (
                <li key={item.name}>
                  <Link href={FLEET_ANCHORS.integrations} className={linkClass}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={FLEET_ROUTES.about} className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link href={FLEET_ROUTES.contact} className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href={FLEET_ROUTES.privacy} className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={FLEET_ROUTES.terms} className={linkClass}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--card-border)] pt-8 sm:flex-row">
          <p className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} {FLEET_SITE_NAME}. All rights reserved.
          </p>
          <p className="text-sm text-[var(--muted)]">
            <a href="mailto:support@cornerstonecmms.com" className="hover:text-[var(--accent)]">
              support@cornerstonecmms.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
