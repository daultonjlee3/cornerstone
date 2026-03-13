"use client";

import type { MappedAssetRow } from "./onboarding-import-types";

type ImportPreviewTableProps = {
  rows: MappedAssetRow[];
};

function displayValue(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  return normalized || "—";
}

export function ImportPreviewTable({ rows }: ImportPreviewTableProps) {
  const preview = rows.slice(0, 10);

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Step 3 — Import Preview
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Preview of the first {preview.length} rows as they will be interpreted.
          </p>
        </div>
        <span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--muted)]">
          {rows.length} rows ready
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="bg-[var(--background)]/80 text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Building</th>
              <th className="px-3 py-2">Asset</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Manufacturer</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Serial #</th>
              <th className="px-3 py-2">Install Date</th>
              <th className="px-3 py-2">Criticality</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, index) => (
              <tr key={`${row.asset_name}-${index}`} className="border-t border-[var(--card-border)]">
                <td className="px-3 py-2 text-[var(--foreground)]">{displayValue(row.property)}</td>
                <td className="px-3 py-2 text-[var(--foreground)]">{displayValue(row.building)}</td>
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                  {displayValue(row.asset_name)}
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">{displayValue(row.asset_type)}</td>
                <td className="px-3 py-2 text-[var(--muted)]">
                  {displayValue(row.manufacturer)}
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">{displayValue(row.model)}</td>
                <td className="px-3 py-2 text-[var(--muted)]">
                  {displayValue(row.serial_number)}
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">
                  {displayValue(row.install_date)}
                </td>
                <td className="px-3 py-2 text-[var(--foreground)]">
                  {displayValue(row.criticality)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
