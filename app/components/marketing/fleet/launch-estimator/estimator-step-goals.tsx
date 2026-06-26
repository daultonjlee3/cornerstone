"use client";

import { Target } from "lucide-react";
import type { LaunchEstimatorInput, OperationalGoalId } from "@/lib/launch-estimator/types";
import { OPERATIONAL_GOALS } from "@/lib/launch-estimator/config";
import { EstimatorCard, estimatorLabelClass } from "./estimator-card";

type Props = {
  input: Partial<LaunchEstimatorInput>;
  onChange: (patch: Partial<LaunchEstimatorInput>) => void;
};

export function EstimatorStepGoals({ input, onChange }: Props) {
  const selected = new Set(input.goals ?? []);

  const toggle = (id: OperationalGoalId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ goals: Array.from(next) as OperationalGoalId[] });
  };

  return (
    <EstimatorCard
      title="Operational Goals"
      description="What outcomes matter most for your rollout? This shapes implementation focus, training, and dashboard configuration."
    >
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 px-4 py-3">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" aria-hidden />
        <p className="text-sm text-[var(--muted)]">
          Select all that apply. Your complexity score and rollout plan are calculated from these
          inputs — not a generic pricing formula.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Operational goals</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPERATIONAL_GOALS.map((goal) => {
            const checked = selected.has(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggle(goal.id)}
                className={`min-h-[52px] rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                  checked
                    ? "border-teal-400/50 bg-teal-400/10 text-teal-200 ring-2 ring-teal-400/20"
                    : "border-[var(--card-border)] bg-[var(--background)]/30 text-[var(--foreground)] hover:border-teal-400/30"
                }`}
                aria-pressed={checked}
              >
                {goal.label}
              </button>
            );
          })}
        </div>
        {(input.goals?.length ?? 0) === 0 ? (
          <p className={`${estimatorLabelClass} mt-4 text-sm font-normal text-amber-400/90`}>
            Select at least one goal to continue.
          </p>
        ) : null}
      </fieldset>
    </EstimatorCard>
  );
}
