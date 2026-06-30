"use client";

import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import type {
  LaunchEstimatorInput,
  LaunchEstimatorLead,
  LaunchEstimatorResult,
} from "@/lib/launch-estimator/types";
import { EstimatorCard } from "./estimator-card";

type Props = {
  input: LaunchEstimatorInput;
  result: LaunchEstimatorResult;
  lead: Partial<LaunchEstimatorLead>;
  onLeadChange: (patch: Partial<LaunchEstimatorLead>) => void;
  onSubmit: (action: "submit" | "download" | "email") => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  emailSent: boolean;
  onReset: () => void;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function EstimatorResults({
  input,
  result,
  lead: _lead,
  onLeadChange: _onLeadChange,
  onSubmit: _onSubmit,
  submitting: _submitting,
  submitError: _submitError,
  emailSent: _emailSent,
  onReset,
}: Props) {
  return (
    <div className="space-y-6">
      <EstimatorCard className="overflow-hidden !p-0">
        <div className="border-b border-[var(--card-border)] bg-gradient-to-br from-teal-400/10 via-transparent to-transparent px-6 py-8 sm:px-8">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-6 w-6 shrink-0 text-teal-400" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
                Your rollout plan
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                Fleet Intelligence Launch Estimate
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Scoped for {input.companyName} · {input.industry}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--card-border)] px-6 py-6 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
            Estimated monthly platform
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            {result.estimatedMonthlyLabel}
          </p>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Illustrative recurring platform pricing after launch — scoped from your fleet size,
            branches, and integrations. Final pricing confirmed during pilot onboarding.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <StatTile label="Estimated Implementation" value={result.estimatedImplementationLabel} />
          <StatTile label="Estimated Timeline" value={result.timelineWeeksDisplay} />
          <StatTile label="Complexity" value={result.complexity} />
          <StatTile
            label="Integrations"
            value={`${result.integrationCount} System${result.integrationCount === 1 ? "" : "s"}`}
          />
        </div>

        {result.customPlanningRecommended ? (
          <div className="mx-6 mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/90 sm:mx-8">
            Custom implementation planning may be recommended.
          </div>
        ) : null}

        <div className="grid gap-6 border-t border-[var(--card-border)] p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Fleet profile
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
              <li>Branches: {result.branchCountDisplay}</li>
              <li>Fleet: {input.truckCount} trucks</li>
              <li>Daily jobs: {input.dailyJobs}</li>
              <li>Dispatchers: {input.dispatcherCount}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Operational focus
            </h3>
            <ul className="mt-3 space-y-2">
              {result.operationalFocus.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </EstimatorCard>

      <EstimatorCard title="Operational Opportunity">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Illustrative ranges based on your fleet profile — not guaranteed outcomes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {result.opportunities.map((opp) => (
            <div
              key={opp.label}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 px-4 py-3"
            >
              <p className="text-xs text-[var(--muted)]">{opp.label}</p>
              <p className="mt-1 text-lg font-bold text-teal-300">{opp.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">{result.disclaimer}</p>
      </EstimatorCard>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--card-border)] px-5 py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-teal-400/40 hover:text-teal-400"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Start new estimate
        </button>
      </div>
    </div>
  );
}
