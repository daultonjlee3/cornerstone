"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";
import type {
  LaunchEstimatorInput,
  LaunchEstimatorLead,
  LaunchEstimatorResult,
} from "@/lib/launch-estimator/types";
import { FLEET_ROUTES } from "@/lib/fleet-marketing-site";
import {
  EstimatorCard,
  estimatorHintClass,
  estimatorInputClass,
  estimatorLabelClass,
} from "./estimator-card";

type Props = {
  input: LaunchEstimatorInput;
  result: LaunchEstimatorResult;
  lead: Partial<LaunchEstimatorLead>;
  onLeadChange: (patch: Partial<LaunchEstimatorLead>) => void;
  onSubmit: (action: "submit" | "download" | "email") => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  emailSent: boolean;
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
  lead,
  onLeadChange,
  onSubmit,
  submitting,
  submitError,
  emailSent,
}: Props) {
  const [showLeadForm, setShowLeadForm] = useState(false);

  const contactQuery = new URLSearchParams({
    source: "launch_estimator",
    company: lead.companyName || input.companyName,
    email: lead.email ?? "",
  }).toString();

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

      <EstimatorCard title="Get your estimate">
        <p className="mb-6 text-sm text-[var(--muted)]">
          Save this scope summary, share it with your team, or schedule a discovery call to validate
          rollout details with our implementation team.
        </p>

        <AnimatePresence mode="wait">
          {!showLeadForm ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            >
              <Link
                href={`${FLEET_ROUTES.requestPilot}?${contactQuery}`}
                className="fm-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Schedule Discovery Call
              </Link>
              <button
                type="button"
                onClick={() => setShowLeadForm(true)}
                className="fm-btn-secondary inline-flex min-h-[48px] items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download Estimate
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await onSubmit("email");
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-company" className={estimatorLabelClass}>
                    Company
                  </label>
                  <input
                    id="lead-company"
                    type="text"
                    value={lead.companyName ?? input.companyName}
                    onChange={(e) => onLeadChange({ companyName: e.target.value })}
                    className={`${estimatorInputClass} mt-2`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-email" className={estimatorLabelClass}>
                    Email
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    autoComplete="email"
                    value={lead.email ?? ""}
                    onChange={(e) => onLeadChange({ email: e.target.value })}
                    className={`${estimatorInputClass} mt-2`}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lead-phone" className={estimatorLabelClass}>
                  Phone <span className="font-normal text-[var(--muted)]">(optional)</span>
                </label>
                <div className="relative mt-2">
                  <Phone
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                    aria-hidden
                  />
                  <input
                    id="lead-phone"
                    type="tel"
                    autoComplete="tel"
                    value={lead.phone ?? ""}
                    onChange={(e) => onLeadChange({ phone: e.target.value })}
                    className={`${estimatorInputClass} pl-10`}
                  />
                </div>
                <p className={estimatorHintClass}>
                  We&apos;ll email your PDF summary and save this estimate for your discovery call.
                </p>
              </div>

              {submitError ? (
                <p className="text-sm text-red-400" role="alert">
                  {submitError}
                </p>
              ) : null}
              {emailSent ? (
                <p className="text-sm text-teal-400" role="status">
                  Estimate sent — check your inbox for the PDF summary.
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  disabled={submitting}
                  className="fm-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  {submitting ? "Sending…" : "Email Estimate to Me"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onSubmit("download")}
                  className="fm-btn-secondary inline-flex min-h-[48px] items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download PDF
                </button>
                <Link
                  href={`${FLEET_ROUTES.requestPilot}?${contactQuery}`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 text-sm font-semibold text-teal-400 hover:text-teal-300"
                >
                  Schedule Discovery Call
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </EstimatorCard>
    </div>
  );
}
