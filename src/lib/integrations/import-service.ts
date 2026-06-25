import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyFieldMappings,
  autoDetectFieldMappings,
  parseTabularInput,
  type FieldMapping,
} from "@/src/lib/integrations/import-engine";
import { validateImportRows, type ValidationIssue } from "@/src/lib/integrations/import-validation";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export type ImportPreviewResponse = {
  mappings: FieldMapping[];
  validation: ReturnType<typeof validateImportRows>;
  previewRows: Record<string, string>[];
};

export type ExecuteImportResponse = {
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

export async function previewImport(
  input: {
    objectType: ImportObjectType;
    csvText?: string;
    spreadsheetText?: string;
    rows?: Array<Record<string, unknown>>;
    mappings?: FieldMapping[];
  }
): Promise<ImportPreviewResponse> {
  const parsed = parseTabularInput(input);
  const mappings = input.mappings?.length
    ? input.mappings
    : autoDetectFieldMappings(input.objectType, parsed.headers);
  const mappedRows = applyFieldMappings(parsed.rows, mappings);
  const validation = validateImportRows(input.objectType, mappedRows);

  return {
    mappings,
    validation,
    previewRows: mappedRows.slice(0, 25),
  };
}

export async function executeImport(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    userId: string | null;
    objectType: ImportObjectType;
    source: "csv" | "spreadsheet" | "rest" | "manual";
    csvText?: string;
    spreadsheetText?: string;
    rows?: Array<Record<string, unknown>>;
    mappings?: FieldMapping[];
    mappingTemplateId?: string | null;
    connectionId?: string | null;
  }
): Promise<ExecuteImportResponse> {
  const preview = await previewImport(input);
  const totalRows = preview.validation.summary.totalRows;
  const startedAt = Date.now();

  const batchId = await createImportBatch(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    source: input.source,
    objectType: input.objectType,
    totalRows,
    mappingTemplateId: input.mappingTemplateId ?? null,
    connectionId: input.connectionId ?? null,
    metadata: {
      auto_detected_mapping_count: preview.mappings.filter((entry) => entry.autoDetected).length,
      mapping_confidence: preview.mappings.map((entry) => ({
        target: entry.targetField,
        confidence: entry.confidence,
      })),
    },
  });

  await persistImportRows(
    supabase,
    input.tenantId,
    batchId,
    preview.validation.issues,
    preview.validation.validRows,
    applyFieldMappings(parseTabularInput(input).rows, preview.mappings)
  );

  const execution = await applyRowsToDomain(supabase, {
    tenantId: input.tenantId,
    objectType: input.objectType,
    rows: preview.validation.validRows,
  });

  const warningRows = preview.validation.summary.warningRows + execution.warningRows;
  const errorRows = preview.validation.summary.errorRows;
  const duplicateRows = execution.duplicateRows + preview.validation.summary.duplicateRows;
  const skippedRows = execution.skippedRows;
  const importedRows = execution.importedRows;

  await updateImportBatch(supabase, {
    tenantId: input.tenantId,
    batchId,
    status: errorRows > 0 && importedRows > 0 ? "partial" : errorRows > 0 ? "failed" : "completed",
    runtimeMs: Date.now() - startedAt,
    summary: {
      total_rows: totalRows,
      imported_rows: importedRows,
      warning_rows: warningRows,
      error_rows: errorRows,
      duplicate_rows: duplicateRows,
      skipped_rows: skippedRows,
    },
  });

  return {
    batchId,
    summary: {
      totalRows,
      importedRows,
      warningRows,
      errorRows,
      duplicateRows,
      skippedRows,
    },
    limitations: execution.limitations,
  };
}

export async function listImportHistory(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 50
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("integration_import_batches")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function listMappingTemplates(
  supabase: SupabaseClient,
  tenantId: string,
  objectType?: ImportObjectType
): Promise<Array<Record<string, unknown>>> {
  let query = supabase
    .from("integration_mapping_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (objectType) {
    query = query.eq("object_type", objectType);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function saveMappingTemplate(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    userId: string | null;
    name: string;
    objectType: ImportObjectType;
    provider: string;
    mappings: FieldMapping[];
    isDefault?: boolean;
  }
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("integration_mapping_templates")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      object_type: input.objectType,
      provider: input.provider,
      mapping: {
        fields: input.mappings,
      },
      is_default: input.isDefault ?? false,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function listFieldMappings(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    objectType?: ImportObjectType;
    connectionId?: string;
    templateId?: string;
  }
): Promise<Array<Record<string, unknown>>> {
  let query = supabase
    .from("integration_field_mappings")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false });
  if (input.objectType) query = query.eq("object_type", input.objectType);
  if (input.connectionId) query = query.eq("connection_id", input.connectionId);
  if (input.templateId) query = query.eq("template_id", input.templateId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function saveFieldMappings(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    objectType: ImportObjectType;
    mappings: Array<{
      sourceField: string;
      targetField: string;
      transformKey?: string | null;
      required?: boolean;
    }>;
    connectionId?: string | null;
    templateId?: string | null;
  }
): Promise<void> {
  const records = input.mappings.map((entry) => ({
    tenant_id: input.tenantId,
    object_type: input.objectType,
    source_field: entry.sourceField,
    target_field: entry.targetField,
    transform_key: entry.transformKey ?? null,
    required: entry.required ?? false,
    connection_id: input.connectionId ?? null,
    template_id: input.templateId ?? null,
  }));
  if (records.length === 0) return;
  const { error } = await supabase.from("integration_field_mappings").insert(records);
  if (error) throw new Error(error.message);
}

async function createImportBatch(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    userId: string | null;
    source: "csv" | "spreadsheet" | "rest" | "manual";
    objectType: ImportObjectType;
    totalRows: number;
    mappingTemplateId: string | null;
    connectionId: string | null;
    metadata: Record<string, unknown>;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("integration_import_batches")
    .insert({
      tenant_id: input.tenantId,
      source: input.source,
      object_type: input.objectType,
      status: "running",
      total_rows: input.totalRows,
      created_by: input.userId,
      mapping_template_id: input.mappingTemplateId,
      connection_id: input.connectionId,
      started_at: new Date().toISOString(),
      request_metadata: input.metadata,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

async function updateImportBatch(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    batchId: string;
    status: "completed" | "partial" | "failed";
    runtimeMs: number;
    summary: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from("integration_import_batches")
    .update({
      status: input.status,
      imported_rows: Number(input.summary.imported_rows ?? 0),
      warning_rows: Number(input.summary.warning_rows ?? 0),
      error_rows: Number(input.summary.error_rows ?? 0),
      duplicate_rows: Number(input.summary.duplicate_rows ?? 0),
      skipped_rows: Number(input.summary.skipped_rows ?? 0),
      runtime_ms: input.runtimeMs,
      finished_at: new Date().toISOString(),
      summary: input.summary,
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.batchId);
  if (error) throw new Error(error.message);
}

async function persistImportRows(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
  issues: ValidationIssue[],
  validRows: Record<string, string>[],
  allRows: Record<string, string>[]
): Promise<void> {
  const issuesByRow = new Map<number, ValidationIssue[]>();
  for (const issue of issues) {
    const list = issuesByRow.get(issue.rowNumber) ?? [];
    list.push(issue);
    issuesByRow.set(issue.rowNumber, list);
  }

  const validSet = new Set(validRows.map((row) => JSON.stringify(row)));
  const rowsPayload = allRows.map((row, idx) => {
    const rowNumber = idx + 2;
    const rowIssues = issuesByRow.get(rowNumber) ?? [];
    const hasError = rowIssues.some((issue) => issue.severity === "error");
    const isValid = validSet.has(JSON.stringify(row));
    return {
      import_batch_id: batchId,
      tenant_id: tenantId,
      row_number: rowNumber,
      status: hasError ? "error" : isValid ? "valid" : "warning",
      external_id: row.external_id ?? null,
      source_payload: row,
      normalized_payload: row,
      errors: rowIssues.filter((issue) => issue.severity === "error"),
      warnings: rowIssues.filter((issue) => issue.severity === "warning"),
    };
  });

  if (rowsPayload.length === 0) return;
  const { error } = await supabase.from("integration_import_rows").insert(rowsPayload);
  if (error) throw new Error(error.message);
}

async function applyRowsToDomain(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    objectType: ImportObjectType;
    rows: Record<string, string>[];
  }
): Promise<{
    importedRows: number;
    warningRows: number;
    duplicateRows: number;
    skippedRows: number;
    limitations: string[];
  }> {
  const companyId = await resolveDefaultCompanyId(supabase, input.tenantId);
  if (!companyId) {
    return {
      importedRows: 0,
      warningRows: 0,
      duplicateRows: 0,
      skippedRows: input.rows.length,
      limitations: ["No tenant-scoped company found for import execution."],
    };
  }

  let importedRows = 0;
  let warningRows = 0;
  let duplicateRows = 0;
  let skippedRows = 0;
  const limitations: string[] = [];

  for (const row of input.rows) {
    const result = await applyRowByObjectType(supabase, input.tenantId, companyId, input.objectType, row);
    if (result.status === "imported") importedRows += 1;
    if (result.status === "warning") warningRows += 1;
    if (result.status === "duplicate") duplicateRows += 1;
    if (result.status === "skipped") skippedRows += 1;
    if (result.limitation) limitations.push(result.limitation);
  }

  return {
    importedRows,
    warningRows,
    duplicateRows,
    skippedRows,
    limitations: [...new Set(limitations)],
  };
}

async function applyRowByObjectType(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  objectType: ImportObjectType,
  row: Record<string, string>
): Promise<{ status: "imported" | "warning" | "duplicate" | "skipped"; limitation?: string }> {
  try {
    if (objectType === "branches") {
      const { error } = await supabase.from("branches").insert({
        company_id: companyId,
        tenant_id: tenantId,
        name: row.name,
        code: row.branch_code,
        timezone: row.timezone || "UTC",
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    if (objectType === "trucks") {
      const branchId = await resolveBranchIdByCode(supabase, tenantId, companyId, row.branch_code);
      if (!branchId) return { status: "skipped", limitation: "Truck row skipped due to unknown branch_code." };
      const { error } = await supabase.from("trucks").insert({
        branch_id: branchId,
        unit_number: row.unit_number,
        truck_type: row.truck_type,
        capacity: row.capacity_gallons ? { gallons: Number(row.capacity_gallons) } : {},
        telematics_device_id: row.external_id || null,
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    if (objectType === "operators") {
      const branchId = await resolveBranchIdByCode(supabase, tenantId, companyId, row.branch_code);
      if (!branchId) return { status: "skipped", limitation: "Operator row skipped due to unknown branch_code." };
      const { error } = await supabase.from("fleet_operators").insert({
        branch_id: branchId,
        name: row.name,
        operator_role: row.operator_role || "operator",
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    if (objectType === "customers") {
      const { error } = await supabase.from("customers").insert({
        company_id: companyId,
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        address: row.address || null,
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    if (objectType === "sites") {
      let customerId: string | null = null;
      if (row.customer_name) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", companyId)
          .ilike("name", row.customer_name)
          .limit(1)
          .maybeSingle();
        customerId = (customer as { id?: string } | null)?.id ?? null;
      }

      const { error } = await supabase.from("customer_sites").insert({
        company_id: companyId,
        tenant_id: tenantId,
        customer_id: customerId,
        name: row.name,
        address_line1: row.address_line1 || null,
        city: row.city || null,
        state: row.state || null,
        postal_code: row.postal_code || null,
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        external_source_id: row.external_id || null,
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    if (objectType === "jobs") {
      const branchId = await resolveBranchIdByCode(supabase, tenantId, companyId, row.branch_code);
      if (!branchId) return { status: "skipped", limitation: "Job row skipped due to unknown branch_code." };
      const siteId = await resolveSiteId(supabase, tenantId, companyId, row.site_name, row.site_external_id);
      if (!siteId) return { status: "skipped", limitation: "Job row skipped due to unresolved site." };

      const { error } = await supabase.from("fleet_jobs").insert({
        branch_id: branchId,
        customer_site_id: siteId,
        title: row.title,
        revenue_estimate: Number(row.revenue_estimate),
        required_truck_type: row.required_truck_type,
        scheduled_start: row.scheduled_start,
        scheduled_end: row.scheduled_end,
        external_source_id: row.external_id || null,
        status: "unassigned",
      });
      if (error) return classifyDbError(error);
      return { status: "imported" };
    }

    return {
      status: "skipped",
      limitation: "Equipment import is scaffolded but requires a finalized fleet equipment domain model.",
    };
  } catch {
    return { status: "warning" };
  }
}

async function resolveDefaultCompanyId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveBranchIdByCode(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  branchCode: string
): Promise<string | null> {
  if (!branchCode?.trim()) return null;
  const { data } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .eq("code", branchCode)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveSiteId(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  siteName: string | undefined,
  siteExternalId: string | undefined
): Promise<string | null> {
  if (siteExternalId?.trim()) {
    const { data: byExternal } = await supabase
      .from("customer_sites")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .eq("external_source_id", siteExternalId)
      .maybeSingle();
    if (byExternal?.id) return byExternal.id as string;
  }
  if (!siteName?.trim()) return null;
  const { data } = await supabase
    .from("customer_sites")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .ilike("name", siteName)
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

function classifyDbError(error: { code?: string; message: string }): {
  status: "warning" | "duplicate";
} {
  if (error.code === "23505") {
    return { status: "duplicate" };
  }
  return { status: "warning" };
}
