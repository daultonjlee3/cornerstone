import { getImportSchema, type ImportObjectType } from "@/src/lib/integrations/import-schemas";

export type ParsedTabularData = {
  headers: string[];
  rows: Record<string, string>[];
  normalizedRows: Record<string, string>[];
};

export type FieldMapping = {
  sourceField: string;
  targetField: string;
  confidence: "high" | "medium" | "low";
  autoDetected: boolean;
};

export function parseTabularInput(input: {
  csvText?: string;
  spreadsheetText?: string;
  rows?: Array<Record<string, unknown>>;
}): ParsedTabularData {
  if (input.rows && input.rows.length > 0) {
    const headers = [...new Set(input.rows.flatMap((row) => Object.keys(row)))];
    const rows = input.rows.map((row) =>
      Object.fromEntries(
        headers.map((header) => [header, toStringValue((row as Record<string, unknown>)[header])])
      )
    );
    return {
      headers,
      rows,
      normalizedRows: normalizeRows(rows),
    };
  }

  const text = (input.csvText ?? input.spreadsheetText ?? "").trim();
  if (!text) {
    return { headers: [], rows: [], normalizedRows: [] };
  }

  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { headers: [], rows: [], normalizedRows: [] };
  }

  const headers = splitLine(lines[0], delimiter).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const columns = splitLine(line, delimiter);
    const record: Record<string, string> = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      record[headers[idx]] = columns[idx]?.trim() ?? "";
    }
    return record;
  });

  return {
    headers,
    rows,
    normalizedRows: normalizeRows(rows),
  };
}

export function autoDetectFieldMappings(
  objectType: ImportObjectType,
  headers: string[]
): FieldMapping[] {
  const schema = getImportSchema(objectType);
  const normalizedHeaderMap = new Map(headers.map((header) => [normalizeKey(header), header]));
  const mappings: FieldMapping[] = [];

  for (const field of schema.fields) {
    const direct = normalizedHeaderMap.get(normalizeKey(field.key));
    if (direct) {
      mappings.push({
        sourceField: direct,
        targetField: field.key,
        confidence: "high",
        autoDetected: true,
      });
      continue;
    }

    const synonym = field.synonyms.find((candidate) => normalizedHeaderMap.has(normalizeKey(candidate)));
    if (synonym) {
      mappings.push({
        sourceField: normalizedHeaderMap.get(normalizeKey(synonym)) ?? synonym,
        targetField: field.key,
        confidence: "medium",
        autoDetected: true,
      });
    }
  }

  return mappings;
}

export function applyFieldMappings(
  rows: Record<string, string>[],
  mappings: FieldMapping[]
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const mapping of mappings) {
      mapped[mapping.targetField] = row[mapping.sourceField] ?? "";
    }
    return mapped;
  });
}

function normalizeRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value.trim()]))
  );
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toStringValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function detectDelimiter(text: string): "," | "\t" | ";" {
  const sample = text.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = (sample.match(/,/g) ?? []).length;
  const tabCount = (sample.match(/\t/g) ?? []).length;
  const semicolonCount = (sample.match(/;/g) ?? []).length;
  if (tabCount > commaCount && tabCount >= semicolonCount) return "\t";
  if (semicolonCount > commaCount && semicolonCount >= tabCount) return ";";
  return ",";
}

function splitLine(line: string, delimiter: "," | "\t" | ";"): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let idx = 0; idx < line.length; idx += 1) {
    const char = line[idx];
    if (char === '"') {
      if (inQuotes && line[idx + 1] === '"') {
        current += '"';
        idx += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}
