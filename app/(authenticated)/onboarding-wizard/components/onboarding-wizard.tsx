"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import type {
  OnboardingWizardState,
  OnboardingWizardStep,
} from "../actions";
import { PageHeader } from "@/src/components/ui/page-header";

type StepConfig = {
  id: OnboardingWizardStep;
  label: string;
  description: string;
  placeholder: string;
};

const STEPS: StepConfig[] = [
  {
    id: "properties",
    label: "Add Properties",
    description: "Import property names first.",
    placeholder: "Sunset Towers\nLakeside Commons",
  },
  {
    id: "buildings",
    label: "Add Buildings",
    description: "Import building names.",
    placeholder: "Building A\nBuilding B",
  },
  {
    id: "technicians",
    label: "Add Technicians",
    description: "Import technician names.",
    placeholder: "Maria Gomez\nRavi Patel",
  },
  {
    id: "products",
    label: "Add Products",
    description: "Import product names for inventory/materials.",
    placeholder: "Air Filter 20x20\nBelt 3L290",
  },
  {
    id: "work_orders",
    label: "Add Work Orders",
    description: "Import starter work order titles.",
    placeholder: "HVAC tune-up - Building A\nLobby lighting repair",
  },
  {
    id: "assets",
    label: "Import Assets",
    description: "Import asset names.",
    placeholder: "RTU-01\nBoiler-2",
  },
  {
    id: "pm_schedules",
    label: "Create PM Schedules",
    description: "Import PM schedule names.",
    placeholder: "Monthly HVAC Inspection\nQuarterly Generator Test",
  },
];

type StepCardProps = {
  step: StepConfig;
  action: (
    prev: OnboardingWizardState,
    formData: FormData
  ) => Promise<OnboardingWizardState>;
  importedCount: number;
};

function StepCard({ step, action, importedCount }: StepCardProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">{step.label}</h2>
          <p className="text-xs text-[var(--muted)]">{step.description}</p>
        </div>
        <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--muted)]">
          {importedCount} imported
        </span>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="step" value={step.id} />
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
            Names (one per line)
          </label>
          <textarea
            name="names_text"
            rows={4}
            placeholder={step.placeholder}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
            CSV file (name column, names only required)
          </label>
          <input
            type="file"
            name="csv_file"
            accept=".csv,text/csv"
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
          />
        </div>
        {state.error ? (
          <p className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-600">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700">
            {state.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {pending ? "Importing..." : `Import ${step.label}`}
        </button>
      </form>
    </article>
  );
}

export function OnboardingWizard({
  counts,
  importAction,
  completeAction,
}: {
  counts: Record<OnboardingWizardStep, number>;
  importAction: (
    prev: OnboardingWizardState,
    formData: FormData
  ) => Promise<OnboardingWizardState>;
  completeAction: () => Promise<void>;
}) {
  const totalImported = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Sparkles className="size-5" />}
        title="Customer Onboarding Wizard"
        subtitle="Import names via textarea or CSV for each onboarding step."
        meta={<span>Total records imported: {totalImported}</span>}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {STEPS.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            action={importAction}
            importedCount={counts[step.id] ?? 0}
          />
        ))}
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Finish onboarding</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Mark onboarding complete and continue to the operations dashboard.
        </p>
        <form action={completeAction} className="mt-3">
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Complete Onboarding
          </button>
        </form>
      </section>
    </div>
  );
}
