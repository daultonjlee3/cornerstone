import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";
import { getImportSchema } from "@/src/lib/integrations/import-schemas";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  rowNumber: number;
  field: string;
  code:
    | "missing_required"
    | "duplicate_truck"
    | "duplicate_operator"
    | "invalid_date"
    | "invalid_gps"
    | "invalid_revenue"
    | "missing_branch"
    | "missing_job_location"
    | "invalid_email"
    | "invalid_phone"
    | "invalid_external_id"
    | "stale_telematics";
  severity: ValidationSeverity;
  message: string;
};

export type ValidationResult = {
  validRows: Record<string, string>[];
  issues: ValidationIssue[];
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    duplicateRows: number;
  };
};

type ValidationContext = {
  staleTelematicsThresholdHours?: number;
};

export function validateImportRows(
  objectType: ImportObjectType,
  rows: Record<string, string>[],
  context?: ValidationContext
): ValidationResult {
  const schema = getImportSchema(objectType);
  const issues: ValidationIssue[] = [];
  const duplicateKeys = new Set<string>();
  const validRows: Record<string, string>[] = [];
  const staleThresholdHours = context?.staleTelematicsThresholdHours ?? 24;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    for (const field of schema.fields.filter((entry) => entry.required)) {
      const value = (row[field.key] ?? "").trim();
      if (!value) {
        issues.push({
          rowNumber,
          field: field.key,
          code: "missing_required",
          severity: "error",
          message: `${field.label} is required.`,
        });
      }
    }

    if (objectType !== "branches" && !(row.branch_code ?? "").trim()) {
      issues.push({
        rowNumber,
        field: "branch_code",
        code: "missing_branch",
        severity: "error",
        message: "Branch code is required for this entity.",
      });
    }

    if (objectType === "trucks") {
      const duplicateKey = `${(row.branch_code ?? "").trim().toLowerCase()}::${(row.unit_number ?? "")
        .trim()
        .toLowerCase()}`;
      if (duplicateKey !== "::") {
        if (duplicateKeys.has(duplicateKey)) {
          issues.push({
            rowNumber,
            field: "unit_number",
            code: "duplicate_truck",
            severity: "error",
            message: "Duplicate truck unit_number in this batch.",
          });
        }
        duplicateKeys.add(duplicateKey);
      }
    }

    if (objectType === "operators") {
      const duplicateKey = `${(row.branch_code ?? "").trim().toLowerCase()}::${(row.name ?? "")
        .trim()
        .toLowerCase()}`;
      if (duplicateKey !== "::") {
        if (duplicateKeys.has(duplicateKey)) {
          issues.push({
            rowNumber,
            field: "name",
            code: "duplicate_operator",
            severity: "error",
            message: "Duplicate operator in this batch.",
          });
        }
        duplicateKeys.add(duplicateKey);
      }
    }

    if ((row.scheduled_start ?? "").trim() && !isValidDate(row.scheduled_start)) {
      issues.push({
        rowNumber,
        field: "scheduled_start",
        code: "invalid_date",
        severity: "error",
        message: "scheduled_start must be a valid date/time.",
      });
    }
    if ((row.scheduled_end ?? "").trim() && !isValidDate(row.scheduled_end)) {
      issues.push({
        rowNumber,
        field: "scheduled_end",
        code: "invalid_date",
        severity: "error",
        message: "scheduled_end must be a valid date/time.",
      });
    }

    if ((row.latitude ?? "").trim() && !isValidLatitude(row.latitude)) {
      issues.push({
        rowNumber,
        field: "latitude",
        code: "invalid_gps",
        severity: "error",
        message: "Latitude must be between -90 and 90.",
      });
    }
    if ((row.longitude ?? "").trim() && !isValidLongitude(row.longitude)) {
      issues.push({
        rowNumber,
        field: "longitude",
        code: "invalid_gps",
        severity: "error",
        message: "Longitude must be between -180 and 180.",
      });
    }

    if ((row.revenue_estimate ?? "").trim() && !isValidNonNegativeNumber(row.revenue_estimate)) {
      issues.push({
        rowNumber,
        field: "revenue_estimate",
        code: "invalid_revenue",
        severity: "error",
        message: "Revenue must be a non-negative number.",
      });
    }

    if (objectType === "jobs") {
      const siteName = (row.site_name ?? "").trim();
      const siteExternalId = (row.site_external_id ?? "").trim();
      if (!siteName && !siteExternalId) {
        issues.push({
          rowNumber,
          field: "site_name",
          code: "missing_job_location",
          severity: "error",
          message: "Job requires site_name or site_external_id.",
        });
      }
    }

    if ((row.email ?? "").trim() && !isValidEmail(row.email)) {
      issues.push({
        rowNumber,
        field: "email",
        code: "invalid_email",
        severity: "error",
        message: "Email format is invalid.",
      });
    }

    if ((row.phone ?? "").trim() && !isValidPhone(row.phone)) {
      issues.push({
        rowNumber,
        field: "phone",
        code: "invalid_phone",
        severity: "warning",
        message: "Phone format appears invalid.",
      });
    }

    if ((row.external_id ?? "").trim() && !isValidExternalId(row.external_id)) {
      issues.push({
        rowNumber,
        field: "external_id",
        code: "invalid_external_id",
        severity: "error",
        message: "external_id contains unsupported characters.",
      });
    }

    if ((row.last_telematics_at ?? "").trim()) {
      const stale = isStaleTelematics(row.last_telematics_at, staleThresholdHours);
      if (stale) {
        issues.push({
          rowNumber,
          field: "last_telematics_at",
          code: "stale_telematics",
          severity: "warning",
          message: `Telematics appears stale (> ${staleThresholdHours}h).`,
        });
      }
    }
  });

  const errorByRow = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.rowNumber));
  for (let idx = 0; idx < rows.length; idx += 1) {
    const rowNumber = idx + 2;
    if (!errorByRow.has(rowNumber)) {
      validRows.push(rows[idx]);
    }
  }

  const warningRows = new Set(
    issues.filter((issue) => issue.severity === "warning").map((issue) => issue.rowNumber)
  ).size;
  const duplicateRows = new Set(
    issues
      .filter((issue) => issue.code === "duplicate_truck" || issue.code === "duplicate_operator")
      .map((issue) => issue.rowNumber)
  ).size;

  return {
    validRows,
    issues,
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      warningRows,
      errorRows: errorByRow.size,
      duplicateRows,
    },
  };
}

function isValidDate(input: string): boolean {
  return Number.isFinite(Date.parse(input));
}

function isValidLatitude(input: string): boolean {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
}

function isValidLongitude(input: string): boolean {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
}

function isValidNonNegativeNumber(input: string): boolean {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

function isValidPhone(input: string): boolean {
  return /^[+\d().\-\s]{7,20}$/.test(input.trim());
}

function isValidExternalId(input: string): boolean {
  return /^[a-zA-Z0-9._:/-]+$/.test(input.trim());
}

function isStaleTelematics(input: string, thresholdHours: number): boolean {
  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed > thresholdHours * 60 * 60 * 1000;
}
