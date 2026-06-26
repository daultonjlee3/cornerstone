"use client";

import { Layers } from "lucide-react";
import type { LaunchEstimatorInput } from "@/lib/launch-estimator/types";
import { countActiveIntegrations, INTEGRATION_CATEGORIES } from "@/lib/launch-estimator/config";
import { EstimatorCard, estimatorLabelClass } from "./estimator-card";

type Props = {
  input: Partial<LaunchEstimatorInput>;
  onChange: (patch: Partial<LaunchEstimatorInput>) => void;
};

export function EstimatorStepSystems({ input, onChange }: Props) {
  const selected = new Set(input.integrations ?? []);
  const integrationCount = countActiveIntegrations(input.integrations ?? []);

  const toggle = (id: string, categoryId: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (categoryId === "fleet" && id === "fleet_none") {
        for (const opt of INTEGRATION_CATEGORIES.find((c) => c.id === "fleet")?.options ?? []) {
          if (opt.id !== "fleet_none") next.delete(opt.id);
        }
      } else if (categoryId === "fleet" && id !== "fleet_none") {
        next.delete("fleet_none");
      }
      next.add(id);
    }
    onChange({ integrations: Array.from(next) });
  };

  return (
    <EstimatorCard
      title="Current Systems"
      description="Select the platforms your operation runs today. We'll scope integration work and data onboarding accordingly."
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-teal-400/20 bg-teal-400/5 px-4 py-3">
        <Layers className="h-5 w-5 shrink-0 text-teal-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {integrationCount} system{integrationCount === 1 ? "" : "s"} requiring integration
          </p>
          <p className="text-xs text-[var(--muted)]">Automatically calculated from your selections</p>
        </div>
      </div>

      <div className="space-y-8">
        {INTEGRATION_CATEGORIES.map((category) => (
          <fieldset key={category.id}>
            <legend className={`${estimatorLabelClass} mb-3`}>{category.title}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {category.options.map((opt) => {
                const checked = selected.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      checked
                        ? "border-teal-400/40 bg-teal-400/10"
                        : "border-[var(--card-border)] bg-[var(--background)]/30 hover:border-teal-400/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.id, category.id)}
                      className="h-4 w-4 rounded border-[var(--card-border)] text-teal-400 focus:ring-teal-400/30"
                    />
                    <span className="text-sm font-medium text-[var(--foreground)]">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </EstimatorCard>
  );
}
