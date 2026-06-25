"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import {
  EmptyState,
  FormSection,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  SkeletonText,
  StatusChip,
} from "@/src/components/design-system";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/ui/form-field";
import {
  DataTable,
  Table,
  TableEmptyState,
  TableHead,
  TBody,
  Td,
  Th,
  Tr,
} from "@/src/components/ui/data-table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { getImportSchema, type ImportObjectType } from "@/src/lib/integrations/import-schemas";

type FieldMapping = {
  sourceField: string;
  targetField: string;
  confidence?: number;
  autoDetected?: boolean;
};

type ValidationIssue = {
  code: string;
  severity: "warning" | "error";
  rowNumber: number;
  field: string;
  message: string;
};

type ImportPreview = {
  mappings: FieldMapping[];
  validation: {
    validRows: Array<Record<string, string>>;
    issues: ValidationIssue[];
    summary: {
      totalRows: number;
      validRows: number;
      warningRows: number;
      errorRows: number;
      duplicateRows: number;
    };
  };
  previewRows?: Array<Record<string, string>>;
};

type ImportExecution = {
  batchId: string;
  summary: {
    totalRows: number;
    importedRows: number;
    warningRows: number;
    errorRows: number;
    duplicateRows: number;
    skippedRows: number;
  };
  limitations: string[];
};

type ImportBatch = {
  id: string;
  object_type: string;
  source: string;
  status: string;
  imported_rows: number;
  warning_rows: number;
  error_rows: number;
  duplicate_rows: number;
  skipped_rows: number;
  runtime_ms: number | null;
  created_at: string;
};

type ImportMethod = "csv_upload" | "copy_paste" | "drag_drop" | "rest_import";

const METHODS: Array<{ key: ImportMethod; label: string }> = [
  { key: "csv_upload", label: "CSV Upload" },
  { key: "copy_paste", label: "Copy / Paste Spreadsheet" },
  { key: "drag_drop", label: "Drag & Drop" },
  { key: "rest_import", label: "REST Import" },
];

const OBJECT_TYPES: ImportObjectType[] = [
  "branches",
  "trucks",
  "operators",
  "jobs",
  "customers",
  "sites",
  "equipment",
];

function suggestedFix(issue: ValidationIssue): string {
  switch (issue.code) {
    case "missing_required":
      return "Populate required values before import.";
    case "duplicate_truck":
    case "duplicate_operator":
      return "Remove duplicate rows or update external IDs.";
    case "invalid_date":
      return "Use ISO date format (YYYY-MM-DD or ISO timestamp).";
    case "invalid_gps":
      return "Provide decimal latitude/longitude values.";
    case "invalid_revenue":
      return "Use numeric revenue values only.";
    case "missing_branch":
      return "Import branches first and provide valid branch_code.";
    case "invalid_email":
      return "Use valid email addresses.";
    case "invalid_phone":
      return "Use standardized phone format.";
    default:
      return "Review row details and correct the incoming data.";
  }
}

function formatDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

export function ImplementationImportsClient({ canManage }: { canManage: boolean }) {
  const [method, setMethod] = useState<ImportMethod>("csv_upload");
  const [objectType, setObjectType] = useState<ImportObjectType>("trucks");
  const [templateName, setTemplateName] = useState("Default Template");
  const [rawText, setRawText] = useState("");
  const [restRowsJson, setRestRowsJson] = useState('[{"branch_code":"HQ","unit_number":"T-101","truck_type":"hydrovac"}]');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [execution, setExecution] = useState<ImportExecution | null>(null);
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const schema = useMemo(() => getImportSchema(objectType), [objectType]);

  const workflowSteps = [
    "Download Template",
    "Upload",
    "Auto Detect",
    "Mapping",
    "Validation",
    "Preview",
    "Import",
    "Summary",
  ];

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/integrations/import/history?limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load import history.");
      const data = (await response.json()) as { batches: ImportBatch[] };
      setHistory(data.batches ?? []);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Failed to load import history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    setPreview(null);
    setExecution(null);
    setMappings([]);
    setMessage(null);
  }, [objectType, method]);

  const uploadTemplate = () => {
    const header = schema.fields.map((field) => field.key).join(",");
    setRawText(`${header}\n`);
    setMessage("Template headers loaded into editor.");
  };

  const onFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    setMethod("csv_upload");
  };

  const onDropText = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    setMethod("drag_drop");
  };

  const previewPayload = () => ({
    object_type: objectType,
    csv_text: rawText,
    mappings,
  });

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (!rawText.trim() && method !== "rest_import") {
        throw new Error("Provide CSV or spreadsheet content before preview.");
      }
      const response = await fetch("/api/integrations/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewPayload()),
      });
      const data = (await response.json()) as ImportPreview & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Preview failed.");
      setPreview(data);
      setMappings(data.mappings ?? []);
      setMessage("Auto-detect + preview completed.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const runValidate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewPayload()),
      });
      const data = (await response.json()) as ImportPreview & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Validation failed.");
      setPreview({ ...data, previewRows: preview?.previewRows ?? [] });
      setMappings(data.mappings ?? mappings);
      setMessage("Validation completed.");
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/import/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          object_type: objectType,
          mappings,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Template save failed.");
      setMessage("Mapping template saved.");
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : "Template save failed.");
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...previewPayload(),
          source: method === "copy_paste" ? "spreadsheet" : method === "rest_import" ? "rest" : "csv",
        }),
      });
      const data = (await response.json()) as ImportExecution & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Import execution failed.");
      setExecution(data);
      setMessage("Import executed successfully.");
      await loadHistory();
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "Import execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const runRestImport = async (dryRun: boolean) => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const parsedRows = JSON.parse(restRowsJson) as Array<Record<string, unknown>>;
      const response = await fetch("/api/integrations/rest/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_type: objectType,
          rows: parsedRows,
          dry_run: dryRun,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        status?: string;
        summary?: Record<string, unknown>;
        batchId?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "REST import failed.");
      setMessage(
        dryRun
          ? "REST dry-run validation completed."
          : `REST import accepted${data.batchId ? ` (batch ${data.batchId})` : ""}.`
      );
      if (!dryRun) {
        await loadHistory();
      }
    } catch (restError) {
      setError(restError instanceof Error ? restError.message : "REST import failed.");
    } finally {
      setLoading(false);
    }
  };

  if (historyLoading && history.length === 0) {
    return (
      <PageLayout>
        <PageSection>
          <Panel padding="md">
            <SkeletonText lines={8} />
          </Panel>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          title="Import workflow"
          description="Download template, upload data, map fields, validate, preview, execute, and review summary."
        />
        <Panel padding="md" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {workflowSteps.map((step, index) => (
              <StatusChip key={step} label={`${index + 1}. ${step}`} tone="neutral" showDot={false} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Import method" htmlFor="method-select">
              <select
                id="method-select"
                className="ui-select"
                value={method}
                onChange={(event) => setMethod(event.target.value as ImportMethod)}
              >
                {METHODS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Object type" htmlFor="object-type-select">
              <select
                id="object-type-select"
                className="ui-select"
                value={objectType}
                onChange={(event) => setObjectType(event.target.value as ImportObjectType)}
              >
                {OBJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={uploadTemplate} disabled={loading}>
              Download Template
            </Button>
            <Button type="button" variant="secondary" onClick={runPreview} disabled={loading}>
              Auto Detect
            </Button>
            <Button type="button" variant="secondary" onClick={runValidate} disabled={loading}>
              Validate
            </Button>
            {canManage ? (
              <Button type="button" onClick={executeImport} disabled={loading}>
                Import
              </Button>
            ) : null}
          </div>
          {error ? (
            <Panel
              padding="sm"
              className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
            >
              <p className="cs-text-caption text-[var(--status-danger)]">{error}</p>
            </Panel>
          ) : null}
          {message ? (
            <Panel
              padding="sm"
              className="border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
            >
              <p className="cs-text-caption text-[var(--status-success)]">{message}</p>
            </Panel>
          ) : null}
        </Panel>
      </PageSection>

      <PageSection>
        <FormSection
          title="Upload / input"
          description="Supports CSV upload, copy/paste spreadsheet text, drag & drop, and REST import payloads."
        >
          {method === "rest_import" ? (
            <FormField
              label="REST rows payload (JSON array)"
              description="Use dry run first to validate payload and mapping hooks."
            >
              <textarea
                className="ui-textarea min-h-[220px]"
                value={restRowsJson}
                onChange={(event) => setRestRowsJson(event.target.value)}
              />
              {canManage ? (
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => runRestImport(true)} disabled={loading}>
                    Dry Run
                  </Button>
                  <Button type="button" size="sm" onClick={() => runRestImport(false)} disabled={loading}>
                    Execute REST Import
                  </Button>
                </div>
              ) : null}
            </FormField>
          ) : (
            <div className="space-y-3">
              <FormField label="Upload CSV file">
                <input
                  type="file"
                  accept=".csv,text/csv,.txt"
                  className="ui-input"
                  onChange={(event) => void onFileUpload(event.target.files?.[0] ?? null)}
                />
              </FormField>
              <div
                className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border-subtle)] bg-[var(--surface-default)] p-4 text-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void onDropText(event)}
              >
                <UploadCloud className="mx-auto mb-2 size-5 text-[var(--text-muted)]" />
                <p className="cs-text-caption cs-text-muted">Drag and drop CSV/spreadsheet text files here</p>
              </div>
              <FormField
                label={method === "copy_paste" ? "Paste spreadsheet text" : "CSV / spreadsheet text"}
                description="Paste raw CSV or tab-delimited data. First line should be header fields."
              >
                <textarea
                  className="ui-textarea min-h-[220px]"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder={schema.fields.map((field) => field.key).join(",")}
                />
              </FormField>
            </div>
          )}
        </FormSection>
      </PageSection>

      <PageSection>
        <SectionHeader title="Field mapping" description="Incoming fields (left) mapped to Cornerstone fields (right)." />
        <Panel padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <FileUp className="size-4 text-[var(--text-muted)]" />
            <p className="cs-text-caption cs-text-muted">
              Auto mapping + manual mapping + template save + transformation key placeholder.
            </p>
          </div>
          <DataTable>
            <Table>
              <TableHead>
                <Th>Incoming Field</Th>
                <Th>Cornerstone Field</Th>
                <Th>Auto</Th>
                <Th>Confidence</Th>
              </TableHead>
              <TBody>
                {mappings.length === 0 ? (
                  <TableEmptyState colSpan={4} message="Run Auto Detect to generate mapping suggestions." />
                ) : (
                  mappings.map((mapping, index) => (
                    <Tr key={`${mapping.sourceField}-${index}`}>
                      <Td>{mapping.sourceField}</Td>
                      <Td>
                        <select
                          className="ui-select"
                          value={mapping.targetField}
                          onChange={(event) =>
                            setMappings((prev) =>
                              prev.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, targetField: event.target.value } : entry
                              )
                            )
                          }
                        >
                          <option value="">Unmapped</option>
                          {schema.fields.map((field) => (
                            <option key={field.key} value={field.key}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>{mapping.autoDetected ? "Yes" : "Manual"}</Td>
                      <Td>{mapping.confidence ? `${Math.round(mapping.confidence * 100)}%` : "—"}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </DataTable>
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Template name" htmlFor="template-name">
              <input
                id="template-name"
                className="ui-input"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </FormField>
            {canManage ? (
              <Button type="button" variant="secondary" size="sm" onClick={saveTemplate} disabled={loading || mappings.length === 0}>
                Save Mapping Template
              </Button>
            ) : null}
          </div>
        </Panel>
      </PageSection>

      <PageSection>
        <SectionHeader
          title="Validation + preview"
          description="Inline issue severity, explanation, and suggested fix before import execution."
        />
        {!preview ? (
          <EmptyState title="No preview yet" description="Run Auto Detect or Validate to generate preview and issues." />
        ) : (
          <div className="space-y-3">
            <Panel padding="md" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatusChip label={`Rows ${preview.validation.summary.totalRows}`} tone="neutral" showDot={false} />
              <StatusChip label={`Valid ${preview.validation.summary.validRows}`} tone="success" showDot={false} />
              <StatusChip label={`Warnings ${preview.validation.summary.warningRows}`} tone="warning" showDot={false} />
              <StatusChip label={`Errors ${preview.validation.summary.errorRows}`} tone="danger" showDot={false} />
              <StatusChip label={`Duplicates ${preview.validation.summary.duplicateRows}`} tone="info" showDot={false} />
            </Panel>

            <Panel padding="md">
              <DataTable>
                <Table className="min-w-[760px]">
                  <TableHead>
                    <Th>Severity</Th>
                    <Th>Row</Th>
                    <Th>Field</Th>
                    <Th>Explanation</Th>
                    <Th>Suggested Fix</Th>
                  </TableHead>
                  <TBody>
                    {preview.validation.issues.length === 0 ? (
                      <TableEmptyState colSpan={5} message="No validation issues detected." />
                    ) : (
                      preview.validation.issues.slice(0, 60).map((issue, index) => (
                        <Tr key={`${issue.code}-${issue.rowNumber}-${index}`}>
                          <Td>
                            <StatusChip
                              label={issue.severity}
                              tone={issue.severity === "error" ? "danger" : "warning"}
                              showDot={false}
                            />
                          </Td>
                          <Td>{issue.rowNumber}</Td>
                          <Td>{issue.field || "—"}</Td>
                          <Td>{issue.message}</Td>
                          <Td className="cs-text-caption cs-text-muted">{suggestedFix(issue)}</Td>
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </DataTable>
            </Panel>

            <Panel padding="md">
              <SectionHeader title="Preview rows" description="Sample transformed rows after mapping (first 25)." />
              <DataTable>
                <Table className="min-w-[760px]">
                  <TableHead>
                    {schema.fields.map((field) => (
                      <Th key={field.key}>{field.key}</Th>
                    ))}
                  </TableHead>
                  <TBody>
                    {(preview.previewRows ?? []).length === 0 ? (
                      <TableEmptyState colSpan={schema.fields.length} message="No preview rows available." />
                    ) : (
                      (preview.previewRows ?? []).slice(0, 20).map((row, index) => (
                        <Tr key={`preview-${index}`}>
                          {schema.fields.map((field) => (
                            <Td key={`${field.key}-${index}`} className="cs-text-caption">
                              {String(row[field.key] ?? "—")}
                            </Td>
                          ))}
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </DataTable>
            </Panel>
          </div>
        )}
      </PageSection>

      <PageSection>
        <SectionHeader title="Import summary" description="Imported, warnings, errors, duplicates, skipped, and runtime." />
        {!execution ? (
          <Panel padding="md">
            <p className="cs-text-caption cs-text-muted">Run Import to generate execution summary.</p>
          </Panel>
        ) : (
          <Panel padding="md" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <StatusChip label={`Imported ${execution.summary.importedRows}`} tone="success" showDot={false} />
              <StatusChip label={`Warnings ${execution.summary.warningRows}`} tone="warning" showDot={false} />
              <StatusChip label={`Errors ${execution.summary.errorRows}`} tone="danger" showDot={false} />
              <StatusChip label={`Duplicates ${execution.summary.duplicateRows}`} tone="info" showDot={false} />
              <StatusChip label={`Skipped ${execution.summary.skippedRows}`} tone="neutral" showDot={false} />
              <StatusChip
                label={`Runtime ${
                  history.find((batch) => batch.id === execution.batchId)?.runtime_ms
                    ? `${history.find((batch) => batch.id === execution.batchId)?.runtime_ms}ms`
                    : "—"
                }`}
                tone="neutral"
                showDot={false}
              />
            </div>
            {execution.limitations.length > 0 ? (
              <Panel padding="sm" className="border-[var(--surface-border-subtle)] bg-[var(--surface-default)]">
                <p className="cs-text-caption font-medium">Limitations</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {execution.limitations.map((limitation) => (
                    <li key={limitation} className="cs-text-caption cs-text-muted">
                      {limitation}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </Panel>
        )}
      </PageSection>

      <PageSection>
        <SectionHeader title="Import history" description="Recent import batches with status and runtime." />
        <DataTable>
          <Table className="min-w-[980px]">
            <TableHead>
              <Th>Created</Th>
              <Th>Object</Th>
              <Th>Method</Th>
              <Th>Status</Th>
              <Th>Imported</Th>
              <Th>Warnings</Th>
              <Th>Errors</Th>
              <Th>Duplicates</Th>
              <Th>Skipped</Th>
              <Th>Runtime</Th>
            </TableHead>
            <TBody>
              {history.length === 0 ? (
                <TableEmptyState colSpan={10} message="No import batches yet." />
              ) : (
                history.map((batch) => (
                  <Tr key={batch.id}>
                    <Td>{formatDate(batch.created_at)}</Td>
                    <Td>{batch.object_type}</Td>
                    <Td>{batch.source}</Td>
                    <Td><StatusBadge status={batch.status} /></Td>
                    <Td>{batch.imported_rows}</Td>
                    <Td>{batch.warning_rows}</Td>
                    <Td>{batch.error_rows}</Td>
                    <Td>{batch.duplicate_rows}</Td>
                    <Td>{batch.skipped_rows}</Td>
                    <Td>{batch.runtime_ms ? `${batch.runtime_ms}ms` : "—"}</Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </DataTable>
      </PageSection>

      {!canManage ? (
        <PageSection>
          <Panel padding="sm" className="border-[var(--surface-border-subtle)] bg-[var(--surface-default)]">
            <p className="cs-text-caption cs-text-muted">
              You currently have read-only access. Import execution, template saves, and REST ingestion require
              integration management permission.
            </p>
          </Panel>
        </PageSection>
      ) : null}

      {execution ? (
        <PageSection>
          <Panel
            padding="md"
            className="flex items-center gap-2 border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
          >
            <CheckCircle2 className="size-4 text-[var(--status-success)]" />
            <p className="cs-text-caption text-[var(--status-success)]">
              Import batch {execution.batchId} completed. Review warnings/errors and proceed to Baseline + Readiness.
            </p>
          </Panel>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
