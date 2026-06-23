"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { geocodeAddress } from "@/src/lib/geocoding";
import { getOrCreateCsvManualConnection } from "@/src/lib/integrations/connections";
import { finishSyncRun, startSyncRun } from "@/src/lib/integrations/sync-runs";
import { upsertExternalMapping } from "@/src/lib/integrations/mappings";
import { requirePermission } from "@/src/lib/permissions";

export type OnboardingDatasetImportState = {
  error?: string;
  success?: string;
  successCount?: number;
  failedRows?: Array<{ row: number; reason: string }>;
  warnings?: Array<{ row: number; reason: string }>;
};

type CsvRow = Record<string, string>;

type FleetImportScope = {
  userId: string;
  tenantId: string;
  companyId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function resolveFleetImportScope(
  companyIdFromForm?: string | null
): Promise<FleetImportScope | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) return null;

  let companyId = companyIdFromForm?.trim() || "";
  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("tenant_id", membership.tenant_id)
      .maybeSingle();
    if (!company) return null;
  } else {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!company?.id) return null;
    companyId = company.id;
  }

  return {
    userId: user.id,
    tenantId: membership.tenant_id,
    companyId,
    supabase,
  };
}

export type FleetImportDataset =
  | "fleet_branches"
  | "fleet_customer_sites"
  | "fleet_trucks"
  | "fleet_operators"
  | "fleet_jobs";

async function withCsvSyncRun<T>(
  scope: FleetImportScope,
  entityLabel: string,
  fn: (connectionId: string, runId: string) => Promise<T>
): Promise<T> {
  const connection = await getOrCreateCsvManualConnection(
    scope.supabase,
    scope.tenantId,
    scope.userId
  );
  const run = await startSyncRun(scope.supabase, connection.id, scope.tenantId);
  try {
    return await fn(connection.id, run.id);
  } catch (error) {
    await finishSyncRun(scope.supabase, run.id, scope.tenantId, {
      status: "failed",
      recordsProcessed: 0,
      recordsFailed: 0,
      errorSummary: error instanceof Error ? error.message : "Import failed",
    });
    throw error;
  }
}

async function importBranches(
  scope: FleetImportScope,
  rows: CsvRow[],
  connectionId: string
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 2;
    const name = (row.name ?? "").trim();
    const code = (row.branch_code ?? row.code ?? "").trim();
    if (!name || !code) {
      failedRows.push({ row: rowNo, reason: "Missing name or branch_code." });
      continue;
    }

    const { data, error } = await scope.supabase
      .from("branches")
      .insert({
        company_id: scope.companyId,
        tenant_id: scope.tenantId,
        name,
        code,
        address_line1: row.address_line1?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        postal_code: row.postal_code?.trim() || null,
        latitude: parseNum(row.latitude),
        longitude: parseNum(row.longitude),
        timezone: row.timezone?.trim() || "UTC",
      })
      .select("id")
      .single();

    if (error) {
      failedRows.push({ row: rowNo, reason: error.message });
      continue;
    }

    const externalId = row.external_id?.trim();
    if (externalId && data?.id) {
      await upsertExternalMapping(scope.supabase, {
        connectionId,
        tenantId: scope.tenantId,
        entityType: "branch",
        externalId,
        internalId: data.id as string,
      });
    }
    successCount += 1;
  }

  return {
    success: `Imported ${successCount} branches.`,
    successCount,
    failedRows,
  };
}

async function importCustomerSites(
  scope: FleetImportScope,
  rows: CsvRow[],
  connectionId: string
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 2;
    const name = (row.site_name ?? row.name ?? "").trim();
    if (!name) {
      failedRows.push({ row: rowNo, reason: "Missing site_name." });
      continue;
    }

    let latitude = parseNum(row.latitude);
    let longitude = parseNum(row.longitude);
    const addressLine1 = row.address_line1?.trim() || null;

    if ((latitude == null || longitude == null) && addressLine1) {
      const geocoded = await geocodeAddress(
        [addressLine1, row.city, row.state, row.postal_code].filter(Boolean).join(", ")
      );
      latitude = geocoded?.latitude ?? latitude;
      longitude = geocoded?.longitude ?? longitude;
    }

    if (latitude == null || longitude == null) {
      failedRows.push({ row: rowNo, reason: "Missing coordinates or geocodable address." });
      continue;
    }

    let customerId: string | null = null;
    const customerName = row.customer_name?.trim();
    if (customerName) {
      const { data: customer } = await scope.supabase
        .from("customers")
        .select("id")
        .eq("company_id", scope.companyId)
        .ilike("name", customerName)
        .limit(1)
        .maybeSingle();
      customerId = (customer as { id?: string } | null)?.id ?? null;
    }

    const { data, error } = await scope.supabase
      .from("customer_sites")
      .insert({
        company_id: scope.companyId,
        tenant_id: scope.tenantId,
        name,
        customer_id: customerId,
        address_line1: addressLine1,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        postal_code: row.postal_code?.trim() || null,
        latitude,
        longitude,
        external_source_id: row.external_id?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      failedRows.push({ row: rowNo, reason: error.message });
      continue;
    }

    const externalId = row.external_id?.trim();
    if (externalId && data?.id) {
      await upsertExternalMapping(scope.supabase, {
        connectionId,
        tenantId: scope.tenantId,
        entityType: "customer_site",
        externalId,
        internalId: data.id as string,
      });
    }
    successCount += 1;
  }

  return {
    success: `Imported ${successCount} customer sites.`,
    successCount,
    failedRows,
  };
}

async function resolveBranchId(
  scope: FleetImportScope,
  row: CsvRow
): Promise<string | null> {
  const code = (row.branch_code ?? "").trim();
  if (!code) return null;
  const { data } = await scope.supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", scope.tenantId)
    .eq("company_id", scope.companyId)
    .eq("code", code)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function importTrucks(
  scope: FleetImportScope,
  rows: CsvRow[],
  connectionId: string
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 2;
    const branchId = await resolveBranchId(scope, row);
    const unitNumber = (row.unit_number ?? "").trim();
    const truckType = (row.truck_type ?? "").trim();
    if (!branchId || !unitNumber || !truckType) {
      failedRows.push({ row: rowNo, reason: "Missing branch_code, unit_number, or truck_type." });
      continue;
    }

    const gallons = parseNum(row.capacity_gallons);
    const { data, error } = await scope.supabase
      .from("trucks")
      .insert({
        branch_id: branchId,
        unit_number: unitNumber,
        truck_type: truckType,
        capacity: gallons != null ? { gallons } : {},
        status: row.status?.trim() || "active",
        telematics_device_id: row.telematics_device_id?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      failedRows.push({ row: rowNo, reason: error.message });
      continue;
    }

    const externalId = row.external_id?.trim();
    if (externalId && data?.id) {
      await upsertExternalMapping(scope.supabase, {
        connectionId,
        tenantId: scope.tenantId,
        entityType: "truck",
        externalId,
        internalId: data.id as string,
      });
    }
    successCount += 1;
  }

  return { success: `Imported ${successCount} trucks.`, successCount, failedRows };
}

async function importOperators(
  scope: FleetImportScope,
  rows: CsvRow[],
  connectionId: string
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 2;
    const branchId = await resolveBranchId(scope, row);
    const name = (row.name ?? "").trim();
    const role = (row.operator_role ?? "").trim();
    if (!branchId || !name || !role) {
      failedRows.push({ row: rowNo, reason: "Missing branch_code, name, or operator_role." });
      continue;
    }

    const { data, error } = await scope.supabase
      .from("fleet_operators")
      .insert({
        branch_id: branchId,
        name,
        operator_role: role,
      })
      .select("id")
      .single();

    if (error) {
      failedRows.push({ row: rowNo, reason: error.message });
      continue;
    }

    const externalId = row.external_id?.trim();
    if (externalId && data?.id) {
      await upsertExternalMapping(scope.supabase, {
        connectionId,
        tenantId: scope.tenantId,
        entityType: "fleet_operator",
        externalId,
        internalId: data.id as string,
      });
    }
    successCount += 1;
  }

  return { success: `Imported ${successCount} operators.`, successCount, failedRows };
}

async function resolveSiteId(
  scope: FleetImportScope,
  row: CsvRow
): Promise<string | null> {
  const externalId = row.site_external_id?.trim();
  if (externalId) {
    const { data: conn } = await scope.supabase
      .from("integration_connections")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .eq("provider", "csv_manual")
      .neq("status", "disabled")
      .maybeSingle();
    if (conn?.id) {
      const { data: mapping } = await scope.supabase
        .from("external_entity_mappings")
        .select("internal_id")
        .eq("connection_id", conn.id)
        .eq("entity_type", "customer_site")
        .eq("external_id", externalId)
        .maybeSingle();
      if (mapping?.internal_id) return mapping.internal_id as string;
    }
  }

  const siteName = (row.site_name ?? "").trim();
  if (!siteName) return null;
  const { data } = await scope.supabase
    .from("customer_sites")
    .select("id")
    .eq("tenant_id", scope.tenantId)
    .eq("company_id", scope.companyId)
    .ilike("name", siteName)
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function importFleetJobs(
  scope: FleetImportScope,
  rows: CsvRow[],
  connectionId: string
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNo = i + 2;
    const branchId = await resolveBranchId(scope, row);
    const siteId = await resolveSiteId(scope, row);
    const title = (row.title ?? "").trim();
    const revenue = parseNum(row.revenue_estimate);
    const truckType = (row.required_truck_type ?? "").trim();

    if (!branchId || !siteId || !title || revenue == null || !truckType) {
      failedRows.push({
        row: rowNo,
        reason: "Missing branch, site, title, revenue_estimate, or required_truck_type.",
      });
      continue;
    }

    let assignedTruckId: string | null = null;
    const unitNumber = row.unit_number?.trim();
    if (unitNumber && branchId) {
      const { data: truck } = await scope.supabase
        .from("trucks")
        .select("id")
        .eq("branch_id", branchId)
        .eq("unit_number", unitNumber)
        .maybeSingle();
      assignedTruckId = (truck as { id?: string } | null)?.id ?? null;
    }

    const { data, error } = await scope.supabase
      .from("fleet_jobs")
      .insert({
        branch_id: branchId,
        customer_site_id: siteId,
        title,
        revenue_estimate: revenue,
        required_truck_type: truckType,
        scheduled_start: row.scheduled_start?.trim() || null,
        scheduled_end: row.scheduled_end?.trim() || null,
        priority: row.priority?.trim() || "medium",
        status: row.status?.trim() || (assignedTruckId ? "scheduled" : "unassigned"),
        assigned_truck_id: assignedTruckId,
        external_source_id: row.external_id?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      failedRows.push({ row: rowNo, reason: error.message });
      continue;
    }

    const externalId = row.external_id?.trim();
    if (externalId && data?.id) {
      await upsertExternalMapping(scope.supabase, {
        connectionId,
        tenantId: scope.tenantId,
        entityType: "fleet_job",
        externalId,
        internalId: data.id as string,
      });
    }
    successCount += 1;
  }

  return { success: `Imported ${successCount} fleet jobs.`, successCount, failedRows };
}

function parseNum(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = parseFloat(value.trim());
  return Number.isFinite(n) ? n : null;
}

export async function importFleetDatasetAction(
  _prev: OnboardingDatasetImportState,
  formData: FormData
): Promise<OnboardingDatasetImportState> {
  await requirePermission("fleet.manage");

  const dataset = ((formData.get("dataset") as string | null) ?? "").trim() as FleetImportDataset;
  const companyId = (formData.get("company_id") as string | null)?.trim() || null;
  const payloadRaw = ((formData.get("rows_payload") as string | null) ?? "").trim();

  const scope = await resolveFleetImportScope(companyId);
  if (!scope) return { error: "Unauthorized." };
  if (!payloadRaw) return { error: "No parsed rows found to import." };

  let rows: CsvRow[] = [];
  try {
    rows = JSON.parse(payloadRaw) as CsvRow[];
  } catch {
    return { error: "Invalid import payload." };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No rows to import." };

  try {
    const result = await withCsvSyncRun(scope, dataset, async (connectionId, runId) => {
      let importResult: OnboardingDatasetImportState;
      if (dataset === "fleet_branches") {
        importResult = await importBranches(scope, rows, connectionId);
      } else if (dataset === "fleet_customer_sites") {
        importResult = await importCustomerSites(scope, rows, connectionId);
      } else if (dataset === "fleet_trucks") {
        importResult = await importTrucks(scope, rows, connectionId);
      } else if (dataset === "fleet_operators") {
        importResult = await importOperators(scope, rows, connectionId);
      } else if (dataset === "fleet_jobs") {
        importResult = await importFleetJobs(scope, rows, connectionId);
      } else {
        return { error: "Invalid fleet dataset." };
      }

      const failed = importResult.failedRows?.length ?? 0;
      const processed = importResult.successCount ?? 0;
      await finishSyncRun(scope.supabase, runId, scope.tenantId, {
        status: failed > 0 && processed > 0 ? "partial" : failed > 0 ? "failed" : "success",
        recordsProcessed: processed,
        recordsFailed: failed,
        errorSummary: failed > 0 ? `${failed} row(s) failed` : null,
        metadata: { dataset, failed_rows: importResult.failedRows ?? [] },
      });

      await scope.supabase
        .from("integration_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "active" })
        .eq("id", connectionId);

      return importResult;
    });

    revalidatePath("/onboarding-wizard");
    revalidatePath("/settings/integrations");
    revalidatePath("/branches");
    revalidatePath("/fleet/trucks");
    revalidatePath("/fleet/jobs");
    revalidatePath("/fleet/sites");
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Fleet import failed." };
  }
}
