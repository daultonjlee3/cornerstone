import { FLEET_OUTCOMES } from "@/lib/fleet-marketing-site";
import {
  BarChart3,
  DollarSign,
  Eye,
  Gauge,
  Route,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const OUTCOME_ICONS: Record<string, LucideIcon> = {
  "Reduce Deadhead": Route,
  "Increase Contribution": DollarSign,
  "Improve Fleet Utilization": Gauge,
  "Protect Revenue": Shield,
  "Improve Dispatcher Productivity": Users,
  "Operational Visibility": Eye,
};

export function OutcomeGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FLEET_OUTCOMES.map((outcome) => {
        const Icon = OUTCOME_ICONS[outcome.title] ?? Sparkles;
        return (
          <div
            key={outcome.title}
            className="fm-card group rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/50 p-6 transition-colors hover:border-teal-400/25"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20 transition-shadow group-hover:shadow-[0_0_20px_rgba(45,212,191,0.12)]">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-[var(--foreground)]">
              {outcome.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{outcome.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export function OutcomeStrip() {
  const strip = [
    ...FLEET_OUTCOMES.slice(0, 4).map((o) => o.title),
    "AI Decision Support",
    "Shorter Implementation",
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {strip.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"
        >
          <BarChart3 className="h-3.5 w-3.5 text-teal-400" aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
