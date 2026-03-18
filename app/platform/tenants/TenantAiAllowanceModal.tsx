"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  TenantAiAllowanceSummary,
  TenantAiAllowanceForm,
} from "./ai-actions";
import {
  getTenantAiAllowance,
  saveTenantAiAllowance,
} from "./ai-actions";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";

const DEFAULTS: TenantAiAllowanceForm = {
  aiEnabled: true,
  monthlyIncludedCostUsd: 25,
  monthlySoftLimitUsd: 20,
  monthlyHardLimitUsd: 25,
  warningThresholdPercent: 80,
  overagePolicy: "DEGRADE_TO_LIGHT",
};

type Props = {
  tenantId: string;
  onClose: () => void;
};

export function TenantAiAllowanceModal({ tenantId, onClose }: Props) {
  const [summary, setSummary] = useState<TenantAiAllowanceSummary | null>(null);
  const [form, setForm] = useState<TenantAiAllowanceForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTenantAiAllowance(tenantId)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setForm(data.config ?? DEFAULTS);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError("Failed to load AI allowance.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleChange = (patch: Partial<TenantAiAllowanceForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleResetDefaults = () => {
    setForm(DEFAULTS);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveTenantAiAllowance(tenantId, form);
      if (res.error) {
        setError(res.error);
        return;
      }
      try {
        const fresh = await getTenantAiAllowance(tenantId);
        setSummary(fresh);
      } catch {
        // ignore
      }
      onClose();
    });
  };

  const usage = summary?.usage;

  return (
    <Modal
      open
      onClose={onClose}
      title="AI allowance"
      description="Control this tenant’s monthly AI budget and limits."
      className="max-w-lg"
    >
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {usage && (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2 text-sm">
              <p className="font-medium text-[var(--foreground)]">
                Used this month: ${usage.currentMonthUsageUsd.toFixed(2)} (
                {usage.usagePercent}%)
              </p>
              <p className="text-xs text-[var(--muted)]">
                Remaining budget: ${usage.remainingBudgetUsd.toFixed(2)} · Status:{" "}
                <span className="font-medium capitalize">
                  {usage.status.replace("_", " ")}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aiEnabled}
                onChange={(e) => handleChange({ aiEnabled: e.target.checked })}
              />
              <span>AI enabled for this tenant</span>
            </label>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Included budget (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
                  value={form.monthlyIncludedCostUsd}
                  onChange={(e) =>
                    handleChange({
                      monthlyIncludedCostUsd: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Warning threshold (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1 w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
                  value={form.warningThresholdPercent}
                  onChange={(e) =>
                    handleChange({
                      warningThresholdPercent: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Soft limit (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
                  value={form.monthlySoftLimitUsd}
                  onChange={(e) =>
                    handleChange({
                      monthlySoftLimitUsd: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Hard limit (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
                  value={form.monthlyHardLimitUsd}
                  onChange={(e) =>
                    handleChange({
                      monthlyHardLimitUsd: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">
                Overage policy
              </label>
              <select
                className="mt-1 w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
                value={form.overagePolicy}
                onChange={(e) =>
                  handleChange({
                    overagePolicy: e.target
                      .value as TenantAiAllowanceForm["overagePolicy"],
                  })
                }
              >
                <option value="DEGRADE_TO_LIGHT">Degrade to light</option>
                <option value="ALLOW_FULL">Allow full over soft limit</option>
                <option value="BLOCK">Block at soft limit</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Reset to standard allowance
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

