import { FLEET_INTEGRATIONS } from "@/lib/fleet-marketing-site";
import {
  Cable,
  Database,
  FileSpreadsheet,
  Link2,
  Radio,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Samsara: Radio,
  Geotab: Truck,
  Motive: Truck,
  Fleetio: Wrench,
  QuickBooks: Wallet,
  ServiceTitan: Wrench,
  "REST API": Cable,
  Webhooks: Link2,
  "CSV Import": FileSpreadsheet,
};

export function IntegrationGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {FLEET_INTEGRATIONS.map((integration) => {
        const Icon = ICONS[integration.name] ?? Database;
        return (
          <div
            key={integration.name}
            className="fm-card group rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-4 transition-colors hover:border-teal-400/30 hover:bg-[var(--card-solid)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20 transition-shadow group-hover:shadow-[0_0_20px_rgba(45,212,191,0.15)]">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              {integration.name}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {integration.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
