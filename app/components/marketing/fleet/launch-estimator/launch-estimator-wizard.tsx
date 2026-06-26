"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  calculateLaunchEstimate,
  normalizeInput,
} from "@/lib/launch-estimator/calculate";
import type { LaunchEstimatorInput, LaunchEstimatorState } from "@/lib/launch-estimator/types";
import {
  createInitialState,
  loadEstimatorState,
  saveEstimatorState,
} from "@/lib/launch-estimator/storage";
import { EstimatorProgress } from "./estimator-progress";
import { EstimatorStepCompany } from "./estimator-step-company";
import { EstimatorStepSystems } from "./estimator-step-systems";
import { EstimatorStepGoals } from "./estimator-step-goals";
import { EstimatorResults } from "./estimator-results";

function canAdvanceStep(step: number, input: Partial<LaunchEstimatorInput>): boolean {
  switch (step) {
    case 0:
      return Boolean(
        input.companyName?.trim() &&
          input.industry?.trim() &&
          input.branchCount &&
          input.truckCount != null &&
          input.dailyJobs != null &&
          input.dispatcherCount != null
      );
    case 1:
      return true;
    case 2:
      return (input.goals?.length ?? 0) > 0;
    default:
      return false;
  }
}

export function LaunchEstimatorWizard() {
  const [state, setState] = useState<LaunchEstimatorState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const saved = loadEstimatorState();
    if (saved) setState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEstimatorState(state);
  }, [state, hydrated]);

  const updateInput = useCallback((patch: Partial<LaunchEstimatorInput>) => {
    setState((prev) => ({
      ...prev,
      input: { ...prev.input, ...patch },
      result: null,
    }));
  }, []);

  const updateLead = useCallback((patch: Partial<LaunchEstimatorState["lead"]>) => {
    setState((prev) => ({ ...prev, lead: { ...prev.lead, ...patch } }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      if (prev.step === 2) {
        const normalized = normalizeInput(prev.input);
        if (!normalized) return prev;
        return {
          ...prev,
          step: 3,
          result: calculateLaunchEstimate(normalized),
          lead: {
            ...prev.lead,
            companyName: prev.lead.companyName || normalized.companyName,
          },
        };
      }
      return { ...prev, step: Math.min(prev.step + 1, 3) };
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0), result: null }));
  }, []);

  const normalizedInput = useMemo(() => normalizeInput(state.input), [state.input]);

  const handleSubmit = useCallback(
    async (action: "submit" | "download" | "email") => {
      if (!normalizedInput) return;
      setSubmitting(true);
      setSubmitError(null);

      try {
        const response = await fetch("/api/launch-estimator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: state.input,
            lead: {
              ...state.lead,
              companyName: state.lead.companyName || normalizedInput.companyName,
            },
            action,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Unable to process estimate");
        }

        if (action === "download") {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "cornerstone-fleet-intelligence-launch-estimate.pdf";
          anchor.click();
          URL.revokeObjectURL(url);
        } else {
          setEmailSent(true);
          setState((prev) => ({ ...prev, submittedAt: new Date().toISOString() }));
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [normalizedInput, state.input, state.lead]
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/40 p-12" />
    );
  }

  const stepContent = [
    <EstimatorStepCompany key="company" input={state.input} onChange={updateInput} />,
    <EstimatorStepSystems key="systems" input={state.input} onChange={updateInput} />,
    <EstimatorStepGoals key="goals" input={state.input} onChange={updateInput} />,
    normalizedInput && state.result ? (
      <EstimatorResults
        key="results"
        input={normalizedInput}
        result={state.result}
        lead={state.lead}
        onLeadChange={updateLead}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        emailSent={emailSent}
      />
    ) : null,
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <EstimatorProgress currentStep={state.step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          {stepContent[state.step]}
        </motion.div>
      </AnimatePresence>

      {state.step < 3 ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={state.step === 0}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvanceStep(state.step, state.input)}
            className="fm-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.step === 2 ? "View Launch Estimate" : "Continue"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
