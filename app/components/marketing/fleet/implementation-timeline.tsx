import { FLEET_IMPLEMENTATION_WEEKS } from "@/lib/fleet-marketing-site";
import { FleetSectionHeader } from "./feature-block";
import { CheckCircle2 } from "lucide-react";

type Props = {
  showHeader?: boolean;
  centered?: boolean;
};

export function ImplementationTimeline({ showHeader = true, centered = true }: Props) {
  return (
    <div>
      {showHeader ? (
        <FleetSectionHeader
          eyebrow="Operational Intelligence Launch"
          title="Four weeks to live — not four months"
          description="Connect your systems, baseline operations, activate AI recommendations, and go live. Your team keeps using their existing software."
          centered={centered}
        />
      ) : null}

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${showHeader ? "mt-10 lg:mt-14" : ""}`}>
        {FLEET_IMPLEMENTATION_WEEKS.map((week, index) => (
          <div
            key={week.week}
            className="fm-implementation-week fm-card relative rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/60 p-6"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                {week.week}
              </span>
              <CheckCircle2 className="h-4 w-4 text-teal-400/50" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">{week.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{week.description}</p>
            {index < FLEET_IMPLEMENTATION_WEEKS.length - 1 ? (
              <div
                className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-teal-400/30 lg:block"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
