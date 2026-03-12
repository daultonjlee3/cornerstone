"use client";

import { useMemo, useState, useTransition } from "react";
import { upsertWorkOrderSlaPolicies } from "../actions";

type CompanyOption = { id: string; name: string };

type SlaPolicyRow = {
  company_id: string;
  priority: string;
  response_target_minutes: number;
};

type Priority = "emergency" | "urgent" | "high" | "medium" | "low";

const PRIORITY_ORDER: Priority[] = [
  "emergency",
  "urgent",
  "high",
  "medium",
  "low",
];

const PRIORITY_LABEL: Record<Priority, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  high: "High",
  medium: "Normal",
  low: "Low",
};

const DEFAULT_MINUTES: Record<Priority, number> = {
  emergency: 60,
  urgent: 120,
  high: 240,
  medium: 1440,
  low: 4320,
};

type WorkOrderSlaSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  companies: CompanyOption[];
  policies: SlaPolicyRow[];
  onSaved?: () => void;
};

function toHours(minutes: number): string {
  return String(Number((minutes / 60).toFixed(2)));
}

export function WorkOrderSlaSettingsModal({
  open,
  onClose,
  companies,
  policies,
  onSaved,
}: WorkOrderSlaSettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  const policyMapByCompany = useMemo(() => {
    const map = new Map<string, Map<Priority, number>>();
    for (const row of policies) {
      const companyPolicies = map.get(row.company_id) ?? new Map<Priority, number>();
      const key = String(row.priority).toLowerCase() as Priority;
      if (PRIORITY_ORDER.includes(key)) {
        companyPolicies.set(key, Number(row.response_target_minutes));
      }
      map.set(row.company_id, companyPolicies);
    }
    return map;
  }, [policies]);
  const getHoursForCompany = (targetCompanyId: string): Record<Priority, string> => {
    const companyPolicies = policyMapByCompany.get(targetCompanyId);
    return {
      emergency: toHours(companyPolicies?.get("emergency") ?? DEFAULT_MINUTES.emergency),
      urgent: toHours(companyPolicies?.get("urgent") ?? DEFAULT_MINUTES.urgent),
      high: toHours(companyPolicies?.get("high") ?? DEFAULT_MINUTES.high),
      medium: toHours(companyPolicies?.get("medium") ?? DEFAULT_MINUTES.medium),
      low: toHours(companyPolicies?.get("low") ?? DEFAULT_MINUTES.low),
    };
  };
  const initialCompanyId = companies[0]?.id ?? "";
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [valuesByPriority, setValuesByPriority] = useState<Record<Priority, string>>(
    () => getHoursForCompany(initialCompanyId)
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = () => {
    setError(null);
    if (!companyId) {
      setError("Select a company.");
      return;
    }

    const payload: { priority: Priority; response_target_minutes: number }[] = [];
    for (const priority of PRIORITY_ORDER) {
      const rawHours = Number(valuesByPriority[priority]);
      if (!Number.isFinite(rawHours) || rawHours <= 0) {
        setError(`${PRIORITY_LABEL[priority]} response target must be greater than 0 hours.`);
        return;
      }
      payload.push({
        priority,
        response_target_minutes: Math.max(1, Math.round(rawHours * 60)),
      });
    }

    startTransition(async () => {
      const result = await upsertWorkOrderSlaPolicies(companyId, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">SLA response settings</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Configure first-response targets by priority.
          </p>
        </div>
        <div className="space-y-4 p-6">
          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="sla-company" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Company
            </label>
            <select
              id="sla-company"
              value={companyId}
              onChange={(event) => {
                const nextCompanyId = event.target.value;
                setCompanyId(nextCompanyId);
                setValuesByPriority(getHoursForCompany(nextCompanyId));
                setError(null);
              }}
              className="ui-select w-full"
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {PRIORITY_ORDER.map((priority) => (
              <div key={priority} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[var(--card-border)] p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{PRIORITY_LABEL[priority]}</p>
                  <p className="text-xs text-[var(--muted)]">Response target</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={valuesByPriority[priority]}
                    onChange={(event) =>
                      setValuesByPriority((current) => ({
                        ...current,
                        [priority]: event.target.value,
                      }))
                    }
                    className="ui-input w-28 text-right"
                  />
                  <span>hours</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 border-t border-[var(--card-border)] px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save SLA Settings"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
