import Link from "next/link";
import {
  FLEET_INTEGRATION_ECOSYSTEM,
  FLEET_INTEGRATIONS_PAGE,
  FLEET_ROUTES,
} from "@/lib/fleet-marketing-site";
import { FleetSectionHeader } from "./feature-block";
import { ArrowRight, Cable, Database, MessageSquare, Radio, Truck, Users, Wallet, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  telematics: Radio,
  "fleet-management": Wrench,
  "erp-accounting": Wallet,
  "field-service": Truck,
  "hr-payroll": Users,
  "data-bi": Database,
  communication: MessageSquare,
  "open-apis": Cable,
};

type Props = {
  showHeader?: boolean;
  showCustomConnector?: boolean;
  compact?: boolean;
};

export function IntegrationEcosystem({
  showHeader = true,
  showCustomConnector = true,
  compact = false,
}: Props) {
  return (
    <div>
      {showHeader ? (
        <FleetSectionHeader
          eyebrow="Integration Ecosystem"
          title={FLEET_INTEGRATIONS_PAGE.headline}
          description={`${FLEET_INTEGRATIONS_PAGE.subheadline} ${FLEET_INTEGRATIONS_PAGE.integrationFirst}`}
          centered
        />
      ) : null}

      <div className={`space-y-10 ${showHeader ? "mt-12 lg:mt-16" : ""}`}>
        {FLEET_INTEGRATION_ECOSYSTEM.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] ?? Database;
          return (
            <section key={category.id} id={category.id} className="scroll-mt-24">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                    {category.title}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">{category.description}</p>
                </div>
              </div>

              <div
                className={`mt-5 grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}`}
              >
                {category.partners.map((partner) => (
                  <div
                    key={partner.name}
                    className="fm-integration-logo group rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)]/50 px-3 py-3 transition-colors hover:border-teal-400/30 hover:bg-[var(--card-solid)]/80"
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-teal-400 transition-colors">
                      {partner.name}
                    </p>
                    {partner.description && !compact ? (
                      <p className="mt-1 text-[10px] leading-snug text-[var(--muted)]">
                        {partner.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {showCustomConnector ? (
        <div className="fm-custom-connector mt-16 rounded-2xl border border-teal-400/25 bg-gradient-to-br from-teal-400/5 via-transparent to-cyan-400/5 p-8 text-center sm:p-12 lg:mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            {FLEET_INTEGRATIONS_PAGE.customConnector.headline}
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {FLEET_INTEGRATIONS_PAGE.customConnector.subheadline}
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {FLEET_INTEGRATIONS_PAGE.customConnector.body}
          </p>
          <Link href={FLEET_ROUTES.contact} className="fm-btn-primary mt-8">
            {FLEET_INTEGRATIONS_PAGE.customConnector.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
