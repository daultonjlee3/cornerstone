"use client";

import { useActionState } from "react";
import type { DemoDataState } from "../asset-first-actions";

type DemoDataGeneratorProps = {
  action: (prev: DemoDataState, formData: FormData) => Promise<DemoDataState>;
};

export function DemoDataGenerator({ action }: DemoDataGeneratorProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const summary = state.summary;

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Generate Sample Demo Data
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Creates 3 properties, 6 buildings, baseline assets plus sub-asset hierarchies, 5
          technicians, 20 work orders, and 10 inventory items with realistic maintenance examples.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {pending ? "Generating..." : "Generate Demo Data"}
        </button>

        {state.error ? (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
            {state.success}
          </p>
        ) : null}

        {summary ? (
          <ul className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.propertiesCreated} properties created
            </li>
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.buildingsCreated} buildings created
            </li>
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.assetsImported} assets imported
            </li>
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.techniciansCreated} technicians created
            </li>
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.workOrdersCreated} work orders created
            </li>
            <li className="rounded-md border border-[var(--card-border)] px-3 py-2">
              {summary.inventoryItemsPrepared} inventory items prepared
            </li>
          </ul>
        ) : null}
      </form>
    </section>
  );
}
