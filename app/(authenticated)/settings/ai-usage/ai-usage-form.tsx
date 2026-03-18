"use client";

import { useState } from "react";
import { saveTenantAiConfig, type TenantAiConfigForm } from "./actions";
import type { OveragePolicy } from "@/src/lib/ai/types";
import type { OveragePolicy } from "@/src/lib/ai/types";

type Props = {
  initial: TenantAiConfigForm;
};

export function AiUsageForm({ initial }: Props) {
  const [form, setForm] = useState<TenantAiConfigForm>(initial);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const result = await saveTenantAiConfig(form);
    setPending(false);
    if (result.error) setMessage({ type: "error", text: result.error });
    else setMessage({ type: "success", text: "AI settings saved." });
  };

  const labelClass = "mb-1 block text-sm font-medium text-[var(--foreground)]";
  const inputClass =
    "w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ai-enabled"
          checked={form.aiEnabled}
          onChange={(e) => setForm((f) => ({ ...f, aiEnabled: e.target.checked }))}
          className="rounded border-[var(--card-border)]"
        />
        <label htmlFor="ai-enabled" className="text-sm font-medium text-[var(--foreground)]">
          AI features enabled
        </label>
      </div>

      <div>
        <label htmlFor="included" className={labelClass}>
          Monthly included budget (USD)
        </label>
        <input
          id="included"
          type="number"
          min={0}
          step={0.01}
          value={form.monthlyIncludedCostUsd}
          onChange={(e) => setForm((f) => ({ ...f, monthlyIncludedCostUsd: Number(e.target.value) || 0 }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="soft" className={labelClass}>
          Soft limit (USD) — degrade to light mode above this
        </label>
        <input
          id="soft"
          type="number"
          min={0}
          step={0.01}
          value={form.monthlySoftLimitUsd}
          onChange={(e) => setForm((f) => ({ ...f, monthlySoftLimitUsd: Number(e.target.value) || 0 }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="hard" className={labelClass}>
          Hard limit (USD) — block above this
        </label>
        <input
          id="hard"
          type="number"
          min={0}
          step={0.01}
          value={form.monthlyHardLimitUsd}
          onChange={(e) => setForm((f) => ({ ...f, monthlyHardLimitUsd: Number(e.target.value) || 0 }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="warning" className={labelClass}>
          Warning threshold (% of hard limit)
        </label>
        <input
          id="warning"
          type="number"
          min={1}
          max={99}
          value={form.warningThresholdPercent}
          onChange={(e) => setForm((f) => ({ ...f, warningThresholdPercent: Number(e.target.value) || 80 }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="overage" className={labelClass}>
          Overage policy
        </label>
        <select
          id="overage"
          value={form.overagePolicy}
          onChange={(e) => setForm((f) => ({ ...f, overagePolicy: e.target.value as OveragePolicy }))}
          className={inputClass}
        >
          <option value="ALLOW_FULL">Allow full (no degrade)</option>
          <option value="DEGRADE_TO_LIGHT">Degrade to light mode</option>
          <option value="BLOCK">Block</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="light-only"
          checked={form.lightModelOnlyOverSoftLimit}
          onChange={(e) => setForm((f) => ({ ...f, lightModelOnlyOverSoftLimit: e.target.checked }))}
          className="rounded border-[var(--card-border)]"
        />
        <label htmlFor="light-only" className="text-sm text-[var(--foreground)]">
          Use light model only when over soft limit
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
