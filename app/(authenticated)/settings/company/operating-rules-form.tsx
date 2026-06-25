"use client";

import { useActionState } from "react";
import type { CompanyOperatingRules } from "@/src/lib/operational-profitability/types";

type OperatingRulesFormProps = {
  companyId: string;
  companyName: string;
  initial: CompanyOperatingRules | null;
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

function Field({
  label,
  name,
  defaultValue,
  step = "0.01",
}: {
  label: string;
  name: string;
  defaultValue: number;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        className="ui-input w-full"
      />
    </label>
  );
}

export function OperatingRulesForm({
  companyId,
  companyName,
  initial,
  saveAction,
}: OperatingRulesFormProps) {
  const [state, formAction, pending] = useActionState(saveAction, {});
  const rules = initial;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="company_id" value={companyId} />
      <div>
        <h3 className="font-semibold text-[var(--foreground)]">{companyName}</h3>
        <p className="text-xs text-[var(--muted)]">
          Labor and variable cost rules for operational profitability — not payroll or GL.
        </p>
      </div>
      {state?.error ? (
        <p className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-800">Saved.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Regular hours / day" name="regular_hours_per_day" defaultValue={rules?.regular_hours_per_day ?? 8} step="0.5" />
        <Field label="Regular hours / week" name="regular_hours_per_week" defaultValue={rules?.regular_hours_per_week ?? 40} step="0.5" />
        <Field label="Daily OT threshold" name="daily_overtime_threshold" defaultValue={rules?.daily_overtime_threshold ?? 8} step="0.5" />
        <Field label="Weekly OT threshold" name="weekly_overtime_threshold" defaultValue={rules?.weekly_overtime_threshold ?? 40} step="0.5" />
        <Field label="OT multiplier" name="overtime_multiplier" defaultValue={rules?.overtime_multiplier ?? 1.5} />
        <Field label="Double-time threshold (daily hrs)" name="double_time_threshold" defaultValue={rules?.double_time_threshold ?? 12} step="0.5" />
        <Field label="Double-time multiplier" name="double_time_multiplier" defaultValue={rules?.double_time_multiplier ?? 2} />
        <Field label="Saturday multiplier" name="saturday_multiplier" defaultValue={rules?.saturday_multiplier ?? 1.5} />
        <Field label="Sunday multiplier" name="sunday_multiplier" defaultValue={rules?.sunday_multiplier ?? 2} />
        <Field label="Holiday multiplier" name="holiday_multiplier" defaultValue={rules?.holiday_multiplier ?? 2} />
        <Field label="Night shift premium" name="night_shift_premium" defaultValue={rules?.night_shift_premium ?? 0.15} step="0.01" />
        <Field label="Travel time pay multiplier" name="travel_time_pay_multiplier" defaultValue={rules?.travel_time_pay_multiplier ?? 1} />
        <Field label="Default operator hourly rate ($)" name="default_operator_hourly_rate" defaultValue={rules?.default_operator_hourly_rate ?? 45} />
        <Field label="Fuel cost / mile ($)" name="fuel_cost_per_mile" defaultValue={rules?.fuel_cost_per_mile ?? 0.85} step="0.01" />
        <Field label="Idle cost / hour ($)" name="idle_cost_per_hour" defaultValue={rules?.idle_cost_per_hour ?? 35} />
        <Field label="Truck fixed cost / hour ($)" name="truck_fixed_cost_per_hour" defaultValue={rules?.truck_fixed_cost_per_hour ?? 28} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save operating rules"}
      </button>
    </form>
  );
}
