"use client";

import type { LaunchEstimatorInput } from "@/lib/launch-estimator/types";
import {
  BRANCH_COUNT_OPTIONS,
  INDUSTRY_OPTIONS,
} from "@/lib/launch-estimator/config";
import {
  EstimatorCard,
  estimatorHintClass,
  estimatorInputClass,
  estimatorLabelClass,
} from "./estimator-card";
import {
  EstimatorSlider,
  formatDailyJobs,
  formatDispatchers,
  formatTruckCount,
} from "./estimator-slider";

type Props = {
  input: Partial<LaunchEstimatorInput>;
  onChange: (patch: Partial<LaunchEstimatorInput>) => void;
};

export function EstimatorStepCompany({ input, onChange }: Props) {
  return (
    <EstimatorCard
      title="Company"
      description="Tell us about your fleet operation so we can scope integration, onboarding, and rollout complexity."
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="company-name" className={estimatorLabelClass}>
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            autoComplete="organization"
            value={input.companyName ?? ""}
            onChange={(e) => onChange({ companyName: e.target.value })}
            className={`${estimatorInputClass} mt-2`}
            placeholder="Acme Industrial Services"
            required
          />
        </div>

        <div>
          <label htmlFor="industry" className={estimatorLabelClass}>
            Industry
          </label>
          <select
            id="industry"
            value={input.industry ?? ""}
            onChange={(e) => onChange({ industry: e.target.value })}
            className={`${estimatorInputClass} mt-2`}
            required
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={estimatorLabelClass}>Branch count</legend>
          <p className={estimatorHintClass}>How many operating branches or yards?</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BRANCH_COUNT_OPTIONS.map((opt) => {
              const selected = input.branchCount === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ branchCount: opt.value })}
                  className={`min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    selected
                      ? "border-teal-400/50 bg-teal-400/10 text-teal-300 ring-2 ring-teal-400/20"
                      : "border-[var(--card-border)] bg-[var(--background)]/40 text-[var(--foreground)] hover:border-teal-400/30"
                  }`}
                  aria-pressed={selected}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <EstimatorSlider
          id="truck-count"
          label="How many trucks?"
          min={1}
          max={250}
          value={input.truckCount ?? 25}
          displayValue={formatTruckCount(input.truckCount ?? 25)}
          onChange={(truckCount) => onChange({ truckCount })}
        />

        <EstimatorSlider
          id="daily-jobs"
          label="Average daily jobs?"
          min={5}
          max={300}
          value={input.dailyJobs ?? 30}
          displayValue={formatDailyJobs(input.dailyJobs ?? 30)}
          onChange={(dailyJobs) => onChange({ dailyJobs })}
        />

        <EstimatorSlider
          id="dispatchers"
          label="Dispatchers?"
          min={1}
          max={20}
          value={input.dispatcherCount ?? 2}
          displayValue={formatDispatchers(input.dispatcherCount ?? 2)}
          onChange={(dispatcherCount) => onChange({ dispatcherCount })}
        />
      </div>
    </EstimatorCard>
  );
}
