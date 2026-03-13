"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { ParsedSpreadsheet } from "./onboarding-import-types";

type AssetImportUploaderProps = {
  onParsed: (spreadsheet: ParsedSpreadsheet) => void;
};

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
  if (!isCsv && !isXlsx) {
    throw new Error("Unsupported file type. Upload .csv or .xlsx");
  }

  if (isCsv) {
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) {
      throw new Error("Spreadsheet must include a header row and at least one data row.");
    }
    const headers = normalizeHeaders(table[0]);
    const rows = rowsToRecords(headers, table.slice(1));
    if (rows.length === 0) {
      throw new Error("No data rows found in spreadsheet.");
    }
    return { fileName, headers, rows };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Could not find a worksheet in the uploaded file.");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const table = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (table.length < 2) {
    throw new Error("Spreadsheet must include a header row and at least one data row.");
  }
  const headers = normalizeHeaders((table[0] ?? []).map((value) => String(value ?? "")));
  const bodyRows = table
    .slice(1)
    .map((row) => row.map((value) => String(value ?? "").trim()));
  const rows = rowsToRecords(headers, bodyRows);
  if (rows.length === 0) {
    throw new Error("No data rows found in spreadsheet.");
  }
  return { fileName, headers, rows };
}

export function AssetImportUploader({ onParsed }: AssetImportUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseFile(file);
      onParsed(parsed);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Step 1 — Upload Asset Spreadsheet
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Drag and drop CSV/XLSX, or browse your files. Flexible headers are supported.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0] ?? null;
          void handleFile(dropped);
        }}
        className={`flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition ${
          dragging
            ? "border-[var(--accent)] bg-[var(--accent)]/10"
            : "border-[var(--card-border)] bg-[var(--background)]"
        }`}
      >
        <span className="text-2xl" aria-hidden>
          📄
        </span>
        <span className="text-sm font-medium text-[var(--foreground)]">
          {loading ? "Parsing spreadsheet..." : "Drop file here or click to upload"}
        </span>
        <span className="text-xs text-[var(--muted)]">Accepted formats: .csv, .xlsx, .xls</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          void handleFile(selected);
          event.currentTarget.value = "";
        }}
      />

      {error ? (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
