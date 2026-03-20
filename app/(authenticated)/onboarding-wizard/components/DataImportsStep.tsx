"use client";

import { useActionState, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  type OnboardingDatasetImportState,
  type OnboardingImportDataset,
} from "../actions";

type ParsedSpreadsheet = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
};

type DatasetConfig = {
  id: OnboardingImportDataset;
  title: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
};

const DATASETS: DatasetConfig[] = [
  {
    id: "work_orders",
    title: "Work Orders",
    description: "Import active and historical work orders. Unresolved technician/asset mappings import as warnings.",
    requiredFields: ["title"],
    optionalFields: [
      "work_order_number",
      "description",
      "status",
      "priority",
      "asset_name",
      "asset_id",
      "technician_name",
      "scheduled_start",
      "scheduled_end",
      "created_at",
      "completed_at",
    ],
  },
  {
    id: "technicians",
    title: "Technicians",
    description: "Import technician records with optional login invite/link mode.",
    requiredFields: ["name"],
    optionalFields: ["email", "role", "trade"],
  },
  {
    id: "pm_schedules",
    title: "Preventive Maintenance",
    description: "Import PM plans and frequencies to seed recurring maintenance.",
    requiredFields: ["name", "frequency"],
    optionalFields: ["asset_name", "next_due_date", "checklist"],
  },
  {
    id: "inventory",
    title: "Inventory / Parts",
    description: "Import parts, stock quantities, and stock locations.",
    requiredFields: ["part_name", "quantity", "location_name"],
    optionalFields: ["sku"],
  },
  {
    id: "vendors",
    title: "Vendors",
    description: "Import vendor directory and contact details.",
    requiredFields: ["vendor_name"],
    optionalFields: ["contact_name", "email", "phone", "service_type"],
  },
];

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Array<string[]> {
  return text
    .replace(/\uFEFF/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseCsvLine(line));
}

function normalizeHeaders(rawHeaders: string[]): string[] {
  return rawHeaders.map((header, index) => {
    const normalized = (header ?? "").trim();
    return normalized || `Column ${index + 1}`;
  });
}

function rowsToRecords(headers: string[], rows: Array<string[]>): Array<Record<string, string>> {
  return rows
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (row[index] ?? "").trim();
      });
      return record;
    })
    .filter((record) => Object.values(record).some((value) => value !== ""));
}

async function parseFile(file: File): Promise<ParsedSpreadsheet> {
  const fileName = file.name;
  const lower = fileName.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
  if (!isCsv && !isXlsx) throw new Error("Unsupported file type. Upload .csv, .xlsx, or .xls.");

  if (isCsv) {
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) throw new Error("Spreadsheet must include headers and at least one row.");
    const headers = normalizeHeaders(table[0]);
    const rows = rowsToRecords(headers, table.slice(1));
    if (rows.length === 0) throw new Error("No data rows found.");
    return { fileName, headers, rows };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("No worksheet found.");
  const sheet = workbook.Sheets[firstSheetName];
  const table = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (table.length < 2) throw new Error("Spreadsheet must include headers and at least one row.");
  const headers = normalizeHeaders((table[0] ?? []).map((v) => String(v ?? "")));
  const bodyRows = table.slice(1).map((row) => row.map((v) => String(v ?? "").trim()));
  const rows = rowsToRecords(headers, bodyRows);
  if (rows.length === 0) throw new Error("No data rows found.");
  return { fileName, headers, rows };
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function detectMapping(headers: string[], fields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  fields.forEach((field) => {
    const exact = normalized.find((h) => h.key === field);
    if (exact) out[field] = exact.raw;
  });
  return out;
}

function buildRowsForImport(
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>,
  fields: string[]
): Array<Record<string, string>> {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    fields.forEach((field) => {
      const source = mapping[field];
      out[field] = source ? row[source] ?? "" : "";
    });
    return out;
  });
}

function templateForDataset(config: DatasetConfig): string {
  const headers = [...config.requiredFields, ...config.optionalFields];
  return `${headers.join(",")}\n`;
}

function downloadTemplateFile(config: DatasetConfig): void {
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(templateForDataset(config))}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${config.id}-template.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function downloadSampleCsvPack(): Promise<void> {
  for (let index = 0; index < DATASETS.length; index += 1) {
    downloadTemplateFile(DATASETS[index]);
    // Small delay helps browsers process sequential downloads.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

type DatasetImportCardProps = {
  config: DatasetConfig;
  action: (
    prev: OnboardingDatasetImportState,
    formData: FormData
  ) => Promise<OnboardingDatasetImportState>;
};

function DatasetImportCard({ config, action }: DatasetImportCardProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [techMode, setTechMode] = useState<"technician_only" | "technician_with_login">(
    "technician_only"
  );

  const allFields = useMemo(
    () => [...config.requiredFields, ...config.optionalFields],
    [config.requiredFields, config.optionalFields]
  );
  const mappedRows = useMemo(() => {
    if (!parsed) return [];
    return buildRowsForImport(parsed.rows, mapping, allFields);
  }, [allFields, mapping, parsed]);
  const validRows = useMemo(
    () =>
      mappedRows.filter((row) =>
        config.requiredFields.every((field) => String(row[field] ?? "").trim().length > 0)
      ),
    [config.requiredFields, mappedRows]
  );

  const onFile = async (file: File | null) => {
    if (!file) return;
    setParseError(null);
    try {
      const next = await parseFile(file);
      setParsed(next);
      setMapping(detectMapping(next.headers, allFields));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse file.");
      setParsed(null);
    }
  };

  return (
    <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{config.title}</h4>
        <p className="text-xs text-[var(--muted)]">{config.description}</p>
      </div>

      <div className="mb-3 flex gap-2">
        <label className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--background)] cursor-pointer">
          Upload CSV/XLSX
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void onFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <a
          download={`${config.id}-template.csv`}
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateForDataset(config))}`}
          className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          Download Template
        </a>
      </div>

      {parsed ? (
        <div className="mb-3 rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted)]">
          File: <span className="font-medium text-[var(--foreground)]">{parsed.fileName}</span> ·{" "}
          {parsed.rows.length} rows
        </div>
      ) : null}
      {parseError ? <p className="mb-3 text-xs text-red-700">{parseError}</p> : null}

      {parsed ? (
        <div className="mb-3 overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="min-w-[520px] w-full text-xs">
            <thead>
              <tr className="bg-[var(--background)]/80 text-[var(--muted)]">
                <th className="px-2 py-2 text-left">Field</th>
                <th className="px-2 py-2 text-left">Column mapping</th>
              </tr>
            </thead>
            <tbody>
              {allFields.map((field) => (
                <tr key={field} className="border-t border-[var(--card-border)]">
                  <td className="px-2 py-2 text-[var(--foreground)]">
                    {field}
                    {config.requiredFields.includes(field) ? (
                      <span className="ml-1 text-red-600">*</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="ui-select text-xs"
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field]: event.target.value || "",
                        }))
                      }
                    >
                      <option value="">Not mapped</option>
                      {parsed.headers.map((header) => (
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
      ) : null}

      {config.id === "technicians" ? (
        <div className="mb-3 flex items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={techMode === "technician_only"}
              onChange={() => setTechMode("technician_only")}
            />
            Technician records only (default)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={techMode === "technician_with_login"}
              onChange={() => setTechMode("technician_with_login")}
            />
            Technician + login invite/link
          </label>
        </div>
      ) : null}

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="dataset" value={config.id} />
        <input type="hidden" name="rows_payload" value={JSON.stringify(validRows)} />
        {config.id === "technicians" ? (
          <input type="hidden" name="technician_mode" value={techMode} />
        ) : null}
        <div className="text-xs text-[var(--muted)]">
          {validRows.length} of {mappedRows.length} rows are valid for import.
        </div>
        {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
        {state.warnings?.length ? (
          <p className="text-xs text-amber-700">{state.warnings.length} warning(s) were reported.</p>
        ) : null}
        {state.failedRows?.length ? (
          <p className="text-xs text-red-700">{state.failedRows.length} row(s) failed validation.</p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || validRows.length === 0}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {pending ? "Importing..." : `Import ${config.title}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setParsed(null);
              setMapping({});
              setParseError(null);
            }}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Skip for now
          </button>
        </div>
      </form>
    </article>
  );
}

type DataImportsStepProps = {
  action: (
    prev: OnboardingDatasetImportState,
    formData: FormData
  ) => Promise<OnboardingDatasetImportState>;
  onBack: () => void;
  onDone: () => void;
};

export function DataImportsStep({ action, onBack, onDone }: DataImportsStepProps) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">Import Your Data (Optional)</h3>
        <p className="text-sm text-[var(--muted)]">
          Bring in existing operations data to get immediate value. You can import any subset now and skip the rest.
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            void downloadSampleCsvPack();
          }}
          className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          Download Sample CSV Pack
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {DATASETS.map((dataset) => (
          <DatasetImportCard key={dataset.id} config={dataset} action={action} />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Continue (Skip remaining imports)
        </button>
      </div>
    </section>
  );
}

