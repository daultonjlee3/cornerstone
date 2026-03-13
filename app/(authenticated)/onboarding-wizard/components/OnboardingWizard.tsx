"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type {
  AssetImportState,
  AssetImportSummary,
  DemoDataState,
} from "../asset-first-actions";
import { AssetImportUploader } from "./AssetImportUploader";
import { ColumnMappingInterface } from "./ColumnMappingInterface";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { DemoDataGenerator } from "./DemoDataGenerator";
import type {
  AssetImportField,
  FieldMapping,
  MappedAssetRow,
  ParsedSpreadsheet,
} from "./onboarding-import-types";

type ExistingCounts = {
  properties: number;
  buildings: number;
  assets: number;
  technicians: number;
  products: number;
  workOrders: number;
  pmPlans: number;
};

type OnboardingWizardProps = {
  counts: ExistingCounts;
  importAction: (prev: AssetImportState, formData: FormData) => Promise<AssetImportState>;
  demoAction: (prev: DemoDataState, formData: FormData) => Promise<DemoDataState>;
  completeAction: () => Promise<void>;
};

const FIELD_LABELS: Record<AssetImportField, string> = {
  property: "Property",
  building: "Building",
  asset_name: "Asset Name",
  asset_type: "Asset Type",
  manufacturer: "Manufacturer",
  model: "Model",
  serial_number: "Serial Number",
  install_date: "Install Date",
  location: "Location",
  notes: "Notes",
  criticality: "Asset Criticality",
};

const FIELD_SYNONYMS: Record<AssetImportField, string[]> = {
  property: ["property", "site", "location property", "campus", "complex"],
  building: ["building", "block", "tower", "facility", "wing"],
  asset_name: ["asset", "asset name", "equipment", "equipment name", "name"],
  asset_type: ["asset type", "type", "equipment type", "category"],
  manufacturer: ["manufacturer", "make", "maker", "brand"],
  model: ["model", "model number", "model no"],
  serial_number: ["serial", "serial number", "serial no", "sn"],
  install_date: ["install date", "installed", "installation date", "commissioned"],
  location: ["location", "asset location", "room", "space"],
  notes: ["notes", "comment", "remarks", "description"],
  criticality: ["criticality", "asset criticality", "priority", "critical"],
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function autoDetectMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeHeader(header),
  }));

  (Object.keys(FIELD_LABELS) as AssetImportField[]).forEach((field) => {
    const synonyms = FIELD_SYNONYMS[field];
    const exact = normalizedHeaders.find((header) => synonyms.includes(header.normalized));
    if (exact) {
      mapping[field] = exact.raw;
      return;
    }
    const partial = normalizedHeaders.find((header) =>
      synonyms.some((synonym) => header.normalized.includes(synonym))
    );
    if (partial) mapping[field] = partial.raw;
  });

  return mapping;
}

function mapRows(spreadsheet: ParsedSpreadsheet | null, mapping: FieldMapping): MappedAssetRow[] {
  if (!spreadsheet) return [];
  return spreadsheet.rows.map((row) => ({
    property: (mapping.property ? row[mapping.property] : "")?.trim() ?? "",
    building: (mapping.building ? row[mapping.building] : "")?.trim() ?? "",
    asset_name: (mapping.asset_name ? row[mapping.asset_name] : "")?.trim() ?? "",
    asset_type: (mapping.asset_type ? row[mapping.asset_type] : "")?.trim() || null,
    manufacturer: (mapping.manufacturer ? row[mapping.manufacturer] : "")?.trim() || null,
    model: (mapping.model ? row[mapping.model] : "")?.trim() || null,
    serial_number: (mapping.serial_number ? row[mapping.serial_number] : "")?.trim() || null,
    install_date: (mapping.install_date ? row[mapping.install_date] : "")?.trim() || null,
    location: (mapping.location ? row[mapping.location] : "")?.trim() || null,
    notes: (mapping.notes ? row[mapping.notes] : "")?.trim() || null,
    criticality: (mapping.criticality ? row[mapping.criticality] : "")?.trim() || null,
  }));
}

function ProgressIndicator({ step }: { step: "upload" | "mapping" | "preview" | "success" }) {
  const steps: Array<{ id: typeof step; title: string; icon: string }> = [
    { id: "upload", title: "Upload", icon: "📤" },
    { id: "mapping", title: "Map Columns", icon: "🧩" },
    { id: "preview", title: "Preview", icon: "👀" },
    { id: "success", title: "Complete", icon: "✅" },
  ];
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="grid gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 sm:grid-cols-4">
      {steps.map((item, index) => {
        const isDone = index <= currentIndex;
        return (
          <li
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-xs ${
              isDone
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
                : "border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            <span className="mr-1" aria-hidden>
              {item.icon}
            </span>
            {item.title}
          </li>
        );
      })}
    </ol>
  );
}

function SuccessSummary({ summary }: { summary: AssetImportSummary }) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p className="rounded-md border border-[var(--card-border)] px-3 py-2 text-[var(--foreground)]">
        {summary.propertiesCreated} Properties Created
      </p>
      <p className="rounded-md border border-[var(--card-border)] px-3 py-2 text-[var(--foreground)]">
        {summary.buildingsCreated} Buildings Created
      </p>
      <p className="rounded-md border border-[var(--card-border)] px-3 py-2 text-[var(--foreground)]">
        {summary.assetsImported} Assets Imported
      </p>
      <p className="rounded-md border border-[var(--card-border)] px-3 py-2 text-[var(--foreground)]">
        {summary.rowsSkippedDuplicate + summary.rowsSkippedMissingRequired} Rows Skipped
      </p>
    </div>
  );
}

export function OnboardingWizard({
  counts,
  importAction,
  demoAction,
  completeAction,
}: OnboardingWizardProps) {
  const [mode, setMode] = useState<"entry" | "upload" | "mapping" | "preview" | "success" | "manual">(
    "entry"
  );
  const [spreadsheet, setSpreadsheet] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [importState, importFormAction, importPending] = useActionState(importAction, {});
  const resolvedMode = importState.success && importState.summary ? "success" : mode;
  const resolvedSummary = importState.summary ?? null;

  const mappedRows = useMemo(() => mapRows(spreadsheet, mapping), [spreadsheet, mapping]);
  const requiredMapped = Boolean(mapping.property && mapping.building && mapping.asset_name);
  const validRows = mappedRows.filter(
    (row) => row.property.trim() && row.building.trim() && row.asset_name.trim()
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Asset-First Onboarding Wizard
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Bootstrap your entire maintenance hierarchy from one asset spreadsheet in minutes.
        </p>
      </header>

      {resolvedMode === "upload" ||
      resolvedMode === "mapping" ||
      resolvedMode === "preview" ||
      resolvedMode === "success" ? (
        <ProgressIndicator
          step={
            resolvedMode === "success"
              ? "success"
              : resolvedMode === "mapping"
              ? "mapping"
              : resolvedMode
          }
        />
      ) : null}

      {resolvedMode === "entry" ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <span aria-hidden>⭐</span>
              Import Asset Spreadsheet (recommended)
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Automatically creates Property → Building → Asset hierarchy and gets your CMMS ready
              fastest.
            </p>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Start Asset Import
            </button>
          </article>

          <DemoDataGenerator action={demoAction} />

          <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <span aria-hidden>🛠️</span>
              Manual Setup
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Skip importing for now and configure modules manually at your own pace.
            </p>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Continue Manually
            </button>
          </article>
        </section>
      ) : null}

      {resolvedMode === "upload" ? (
        <div className="space-y-4">
          <AssetImportUploader
            onParsed={(parsed) => {
              setSpreadsheet(parsed);
              setMapping(autoDetectMapping(parsed.headers));
              setMode("mapping");
            }}
          />
          <button
            type="button"
            onClick={() => setMode("entry")}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Back
          </button>
        </div>
      ) : null}

      {resolvedMode === "mapping" && spreadsheet ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted)]">
            File: <span className="font-medium text-[var(--foreground)]">{spreadsheet.fileName}</span>
            {" · "}
            {spreadsheet.rows.length} data rows
          </div>
          <ColumnMappingInterface headers={spreadsheet.headers} mapping={mapping} onChange={setMapping} />
          {!requiredMapped ? (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700">
              Map Property, Building, and Asset Name before continuing.
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Change File
            </button>
            <button
              type="button"
              disabled={!requiredMapped}
              onClick={() => setMode("preview")}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              Continue to Preview
            </button>
          </div>
        </div>
      ) : null}

      {resolvedMode === "preview" && spreadsheet ? (
        <div className="space-y-4">
          <ImportPreviewTable rows={validRows} />
          <form action={importFormAction} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <input type="hidden" name="rows_payload" value={JSON.stringify(validRows)} />
            <div className="mb-3 text-xs text-[var(--muted)]">
              {validRows.length} of {mappedRows.length} rows will be imported. Rows missing Property,
              Building, or Asset Name are skipped.
            </div>
            {importState.error ? (
              <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700">
                {importState.error}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("mapping")}
                className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Back to Mapping
              </button>
              <button
                type="submit"
                disabled={importPending || validRows.length === 0}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {importPending ? "Importing..." : "Step 4 — Create Hierarchy & Import Assets"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {resolvedMode === "success" && resolvedSummary ? (
        <section className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <h3 className="text-xl font-semibold text-emerald-800">Import Complete</h3>
          <SuccessSummary summary={resolvedSummary} />
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-800">Suggested next steps</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-900">
              <li>Add Technicians</li>
              <li>Import Inventory</li>
              <li>Create Preventive Maintenance</li>
              <li>Create Starter Work Orders</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/technicians"
              className="rounded-lg border border-emerald-700/30 px-3 py-2 text-sm text-emerald-900 hover:bg-emerald-500/10"
            >
              Add Technicians
            </Link>
            <Link
              href="/inventory"
              className="rounded-lg border border-emerald-700/30 px-3 py-2 text-sm text-emerald-900 hover:bg-emerald-500/10"
            >
              Import Inventory
            </Link>
            <Link
              href="/preventive-maintenance"
              className="rounded-lg border border-emerald-700/30 px-3 py-2 text-sm text-emerald-900 hover:bg-emerald-500/10"
            >
              Create PM
            </Link>
            <Link
              href="/work-orders"
              className="rounded-lg border border-emerald-700/30 px-3 py-2 text-sm text-emerald-900 hover:bg-emerald-500/10"
            >
              Starter Work Orders
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="rounded-lg border border-emerald-700/30 px-3 py-2 text-sm text-emerald-900 hover:bg-emerald-500/10"
            >
              Import Another File
            </button>
            <form action={completeAction}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Finish Onboarding
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {resolvedMode === "manual" ? (
        <section className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Manual Setup</h3>
          <p className="text-sm text-[var(--muted)]">
            Build your environment manually. You can return to this wizard anytime.
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/properties">
              Properties ({counts.properties})
            </Link>
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/buildings">
              Buildings ({counts.buildings})
            </Link>
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/assets">
              Assets ({counts.assets})
            </Link>
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/technicians">
              Technicians ({counts.technicians})
            </Link>
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/inventory">
              Products ({counts.products})
            </Link>
            <Link className="rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--background)]" href="/work-orders">
              Work Orders ({counts.workOrders})
            </Link>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("entry")}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Back
            </button>
            <form action={completeAction}>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Finish Onboarding
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
