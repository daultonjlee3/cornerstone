"use client";

import type { AssetImportField, FieldMapping } from "./onboarding-import-types";

const FIELD_CONFIG: Array<{
  field: AssetImportField;
  label: string;
  required?: boolean;
}> = [
  { field: "property", label: "Property", required: true },
  { field: "building", label: "Building", required: true },
  { field: "asset_name", label: "Asset Name", required: true },
  { field: "asset_type", label: "Asset Type" },
  { field: "manufacturer", label: "Manufacturer" },
  { field: "model", label: "Model" },
  { field: "serial_number", label: "Serial Number" },
  { field: "install_date", label: "Install Date" },
  { field: "location", label: "Location" },
  { field: "notes", label: "Notes" },
  { field: "criticality", label: "Asset Criticality" },
];

type ColumnMappingInterfaceProps = {
  headers: string[];
  mapping: FieldMapping;
  onChange: (next: FieldMapping) => void;
};

export function ColumnMappingInterface({
  headers,
  mapping,
  onChange,
}: ColumnMappingInterfaceProps) {
  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Step 2 — Map Spreadsheet Columns
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Match spreadsheet columns to Cornerstone fields. Only Property, Building, and Asset Name are
          required.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="bg-[var(--background)]/80 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-3 py-2">System Field</th>
              <th className="px-3 py-2">Spreadsheet Column</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_CONFIG.map((item) => (
              <tr key={item.field} className="border-t border-[var(--card-border)]">
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                  {item.label} {item.required ? <span className="text-red-600">*</span> : null}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={mapping[item.field] ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...mapping,
                        [item.field]: event.target.value || undefined,
                      })
                    }
                    className="ui-select"
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted)]">
        Criticality values are normalized to: <strong>Low</strong>, <strong>Medium</strong>,{" "}
        <strong>High</strong>, <strong>Critical</strong>. Unrecognized or blank values default to{" "}
        <strong>Medium</strong>.
      </div>
    </section>
  );
}
