"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export type OnboardingWizardStep =
  | "properties"
  | "buildings"
  | "technicians"
  | "products"
  | "work_orders"
  | "assets"
  | "pm_schedules";

export type OnboardingWizardState = {
  error?: string;
  success?: string;
};

export type OnboardingImportDataset =
  | "work_orders"
  | "technicians"
  | "pm_schedules"
  | "inventory"
  | "vendors";

export type OnboardingDatasetImportState = {
  error?: string;
  success?: string;
  successCount?: number;
  failedRows?: Array<{ row: number; reason: string }>;
  warnings?: Array<{ row: number; reason: string }>;
};

type Scope = {
  userId: string;
  tenantId: string;
  companyId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function resolveScope(): Promise<Scope | null> {
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

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!company?.id) return null;

  return {
    userId: user.id,
    tenantId: membership.tenant_id,
    companyId: company.id,
    supabase,
  };
}

function parseCsvLineFirstColumn(line: string): string {
  const raw = line.trim();
  if (!raw) return "";
  if (!raw.includes(",")) return raw.replace(/^"|"$/g, "").trim();
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '"') {
      if (inQuotes && raw[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) break;
    value += char;
  }
  return value.trim();
}

function parseNamesFromText(rawText: string): string[] {
  const normalized = rawText.replace(/\uFEFF/g, "").trim();
  if (!normalized) return [];
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const maybeHeader = parseCsvLineFirstColumn(lines[0]).toLowerCase();
  const startIndex = maybeHeader === "name" ? 1 : 0;
  const names = lines
    .slice(startIndex)
    .map((line) => parseCsvLineFirstColumn(line))
    .map((name) => name.trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

async function parseImportedNames(formData: FormData): Promise<string[]> {
  const inlineText = ((formData.get("names_text") as string | null) ?? "").trim();
  const namesFromText = parseNamesFromText(inlineText);

  const file = formData.get("csv_file");
  let namesFromCsv: string[] = [];
  if (file instanceof File && file.size > 0) {
    const csvText = await file.text();
    namesFromCsv = parseNamesFromText(csvText);
  }

  return Array.from(new Set([...namesFromText, ...namesFromCsv]));
}

async function importProperties(scope: Scope, names: string[]): Promise<number> {
  const rows = names.map((name) => ({
    company_id: scope.companyId,
    name,
    property_name: name,
    status: "active",
  }));
  const { data, error } = await scope.supabase
    .from("properties")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importBuildings(scope: Scope, names: string[]): Promise<number> {
  const { data: properties } = await scope.supabase
    .from("properties")
    .select("id")
    .eq("company_id", scope.companyId)
    .order("created_at", { ascending: true })
    .limit(1);
  const propertyId = (properties?.[0] as { id?: string } | undefined)?.id ?? null;
  if (!propertyId) {
    throw new Error("Import at least one property before importing buildings.");
  }
  const rows = names.map((name) => ({
    tenant_id: scope.tenantId,
    property_id: propertyId,
    name,
    building_name: name,
    status: "active",
  }));
  const { data, error } = await scope.supabase
    .from("buildings")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importTechnicians(scope: Scope, names: string[]): Promise<number> {
  const rows = names.map((name) => ({
    tenant_id: scope.tenantId,
    company_id: scope.companyId,
    name,
    technician_name: name,
    status: "active",
  }));
  const { data, error } = await scope.supabase
    .from("technicians")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importProducts(scope: Scope, names: string[]): Promise<number> {
  const rows = names.map((name) => ({
    company_id: scope.companyId,
    name,
    active: true,
  }));
  const { data, error } = await scope.supabase
    .from("products")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importWorkOrders(scope: Scope, names: string[]): Promise<number> {
  const { data: properties } = await scope.supabase
    .from("properties")
    .select("id")
    .eq("company_id", scope.companyId)
    .order("created_at", { ascending: true })
    .limit(1);
  const propertyId = (properties?.[0] as { id?: string } | undefined)?.id ?? null;
  const rows = names.map((name) => ({
    tenant_id: scope.tenantId,
    company_id: scope.companyId,
    property_id: propertyId,
    title: name,
    description: `Imported during onboarding: ${name}`,
    status: "new",
    priority: "medium",
  }));
  const { data, error } = await scope.supabase
    .from("work_orders")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importAssets(scope: Scope, names: string[]): Promise<number> {
  const { data: locationRows } = await scope.supabase
    .from("properties")
    .select("id")
    .eq("company_id", scope.companyId)
    .order("created_at", { ascending: true })
    .limit(1);
  const propertyId = (locationRows?.[0] as { id?: string } | undefined)?.id ?? null;
  const { data: buildingRows } = propertyId
    ? await scope.supabase
        .from("buildings")
        .select("id")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: true })
        .limit(1)
    : { data: [] as unknown[] };
  const buildingId = (buildingRows?.[0] as { id?: string } | undefined)?.id ?? null;
  const rows = names.map((name) => ({
    tenant_id: scope.tenantId,
    company_id: scope.companyId,
    property_id: propertyId,
    building_id: buildingId,
    name,
    asset_name: name,
    status: "active",
  }));
  const { data, error } = await scope.supabase
    .from("assets")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

async function importPmSchedules(scope: Scope, names: string[]): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: assets } = await scope.supabase
    .from("assets")
    .select("id, property_id, building_id")
    .eq("company_id", scope.companyId)
    .order("created_at", { ascending: true })
    .limit(1);
  const defaultAsset = (assets?.[0] as {
    id?: string;
    property_id?: string | null;
    building_id?: string | null;
  } | null) ?? null;
  const rows = names.map((name) => ({
    tenant_id: scope.tenantId,
    company_id: scope.companyId,
    asset_id: defaultAsset?.id ?? null,
    property_id: defaultAsset?.property_id ?? null,
    building_id: defaultAsset?.building_id ?? null,
    name,
    frequency_type: "monthly",
    frequency_interval: 1,
    start_date: today,
    next_run_date: today,
    auto_create_work_order: true,
    priority: "medium",
    status: "active",
  }));
  const { data, error } = await scope.supabase
    .from("preventive_maintenance_plans")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

export async function importOnboardingStepAction(
  _prev: OnboardingWizardState,
  formData: FormData
): Promise<OnboardingWizardState> {
  const scope = await resolveScope();
  if (!scope) return { error: "Unauthorized." };

  const step = ((formData.get("step") as string | null) ?? "").trim() as OnboardingWizardStep;
  const names = await parseImportedNames(formData);
  if (names.length === 0) {
    return { error: "Provide at least one name (textarea or CSV)." };
  }

  try {
    let inserted = 0;
    if (step === "properties") inserted = await importProperties(scope, names);
    else if (step === "buildings") inserted = await importBuildings(scope, names);
    else if (step === "technicians") inserted = await importTechnicians(scope, names);
    else if (step === "products") inserted = await importProducts(scope, names);
    else if (step === "work_orders") inserted = await importWorkOrders(scope, names);
    else if (step === "assets") inserted = await importAssets(scope, names);
    else if (step === "pm_schedules") inserted = await importPmSchedules(scope, names);
    else return { error: "Invalid onboarding step." };

    revalidatePath("/onboarding-wizard");
    return { success: `Imported ${inserted} record(s).` };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to import onboarding records.",
    };
  }
}

export async function completeOnboardingWizardAction(): Promise<void> {
  const scope = await resolveScope();
  if (!scope) redirect("/login");

  await scope.supabase
    .from("companies")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", scope.companyId);

  redirect("/dashboard");
}

type CsvRow = Record<string, string>;

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toIsoOrNull(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseFrequency(value: string | null | undefined):
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | null {
  const v = norm(value);
  if (v === "daily" || v === "weekly" || v === "monthly" || v === "quarterly" || v === "yearly") {
    return v;
  }
  return null;
}

function parsePositiveInt(value: string | null | undefined): number {
  const n = Number((value ?? "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

async function importWorkOrdersDataset(
  scope: Scope,
  rows: CsvRow[]
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];

  const { data: assets } = await scope.supabase
    .from("assets")
    .select("id, asset_name, name")
    .eq("company_id", scope.companyId);
  const { data: techs } = await scope.supabase
    .from("technicians")
    .select("id, name, technician_name")
    .eq("company_id", scope.companyId);

  const assetById = new Map<string, string>();
  const assetByName = new Map<string, string>();
  (assets ?? []).forEach((row) => {
    const r = row as { id: string; asset_name?: string | null; name?: string | null };
    assetById.set(r.id, r.id);
    const label = norm(r.asset_name ?? r.name ?? "");
    if (label) assetByName.set(label, r.id);
  });
  const techByName = new Map<string, string>();
  (techs ?? []).forEach((row) => {
    const r = row as { id: string; name?: string | null; technician_name?: string | null };
    const label = norm(r.technician_name ?? r.name ?? "");
    if (label) techByName.set(label, r.id);
  });

  const inserts: Record<string, unknown>[] = [];
  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const title = (row.title ?? "").trim();
    const woNum = (row.work_order_number ?? "").trim();
    if (!title && !woNum) {
      failedRows.push({ row: rowNo, reason: "Missing required core field: title or work_order_number." });
      return;
    }
    const status = (row.status ?? "").trim() || "new";
    const priority = (row.priority ?? "").trim() || "medium";
    const assetIdRaw = (row.asset_id ?? "").trim();
    const assetNameRaw = (row.asset_name ?? "").trim();
    const resolvedAssetId =
      (assetIdRaw && assetById.get(assetIdRaw)) || (assetNameRaw && assetByName.get(norm(assetNameRaw))) || null;
    if (!resolvedAssetId && (assetIdRaw || assetNameRaw)) {
      warnings.push({ row: rowNo, reason: "Asset not resolved; importing without asset link." });
    }
    const techNameRaw = (row.technician_name ?? "").trim();
    const assignedTechnicianId = techNameRaw ? techByName.get(norm(techNameRaw)) ?? null : null;
    if (techNameRaw && !assignedTechnicianId) {
      warnings.push({ row: rowNo, reason: "Technician not resolved; importing as unassigned." });
    }
    const scheduledStart = toIsoOrNull(row.scheduled_start);
    const scheduledEnd = toIsoOrNull(row.scheduled_end);
    const createdAt = toIsoOrNull(row.created_at);
    const completedAt = toIsoOrNull(row.completed_at);
    const scheduledDate = scheduledStart ? scheduledStart.slice(0, 10) : null;
    inserts.push({
      tenant_id: scope.tenantId,
      company_id: scope.companyId,
      work_order_number: woNum || null,
      title: title || woNum || "Imported Work Order",
      description: (row.description ?? "").trim() || null,
      status,
      priority,
      asset_id: resolvedAssetId,
      assigned_technician_id: assignedTechnicianId,
      scheduled_date: scheduledDate,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      created_at: createdAt ?? undefined,
      completed_at: completedAt,
    });
  });

  if (inserts.length > 0) {
    const { error } = await scope.supabase.from("work_orders").insert(inserts);
    if (error) return { error: error.message };
  }
  return {
    success: `Imported ${inserts.length} work orders.`,
    successCount: inserts.length,
    failedRows,
    warnings,
  };
}

async function resolveOrInviteTechnicianUser(email: string, technicianName: string): Promise<string | null> {
  const admin = createAdminClient();
  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: technicianName, role: "technician", is_portal_only: true },
  });
  if (!invite.error && invite.data.user?.id) return invite.data.user.id;
  const usersResult = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 });
  if (usersResult.error) return null;
  const existing = usersResult.data.users.find((u) => norm(u.email) === norm(email));
  return existing?.id ?? null;
}

async function importTechniciansDataset(
  scope: Scope,
  rows: CsvRow[],
  loginMode: boolean
): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  const { data: existingTechs } = await scope.supabase
    .from("technicians")
    .select("id, email")
    .eq("company_id", scope.companyId);
  const existingByEmail = new Map<string, string>();
  (existingTechs ?? []).forEach((row) => {
    const r = row as { id: string; email?: string | null };
    const key = norm(r.email);
    if (key) existingByEmail.set(key, r.id);
  });

  for (let index = 0; index < rows.length; index += 1) {
    const rowNo = index + 2;
    const row = rows[index];
    const name = (row.name ?? "").trim();
    const email = (row.email ?? "").trim().toLowerCase() || null;
    if (!name) {
      failedRows.push({ row: rowNo, reason: "Missing required field: name." });
      continue;
    }
    if (loginMode && !email) {
      failedRows.push({ row: rowNo, reason: "Email is required when login mode is enabled." });
      continue;
    }

    const existingId = email ? existingByEmail.get(norm(email)) ?? null : null;
    let userId: string | null = null;
    if (loginMode && email) {
      userId = await resolveOrInviteTechnicianUser(email, name);
      if (!userId) {
        warnings.push({ row: rowNo, reason: "Could not create/login-link auth user; technician imported without linked login." });
      } else {
        await scope.supabase.from("users").upsert(
          { id: userId, full_name: name, is_portal_only: true },
          { onConflict: "id" }
        );
        await scope.supabase.from("tenant_memberships").upsert(
          { tenant_id: scope.tenantId, user_id: userId, role: "technician" },
          { onConflict: "tenant_id,user_id" }
        );
        await scope.supabase.from("company_memberships").upsert(
          { company_id: scope.companyId, user_id: userId, role: "technician" },
          { onConflict: "company_id,user_id" }
        );
      }
    }

    const payload = {
      tenant_id: scope.tenantId,
      company_id: scope.companyId,
      name,
      technician_name: name,
      email,
      trade: (row.trade ?? "").trim() || null,
      status: "active",
      user_id: userId,
    };
    const result = existingId
      ? await scope.supabase.from("technicians").update(payload).eq("id", existingId)
      : await scope.supabase.from("technicians").insert(payload);
    if (result.error) {
      failedRows.push({ row: rowNo, reason: result.error.message });
      continue;
    }
    successCount += 1;
  }

  return {
    success: `Imported ${successCount} technicians.`,
    successCount,
    failedRows,
    warnings,
  };
}

async function importPmDataset(scope: Scope, rows: CsvRow[]): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];
  const { data: assets } = await scope.supabase
    .from("assets")
    .select("id, asset_name, name")
    .eq("company_id", scope.companyId);
  const assetByName = new Map<string, string>();
  (assets ?? []).forEach((row) => {
    const r = row as { id: string; asset_name?: string | null; name?: string | null };
    const key = norm(r.asset_name ?? r.name ?? "");
    if (key) assetByName.set(key, r.id);
  });

  const inserts: Record<string, unknown>[] = [];
  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const name = (row.name ?? "").trim();
    if (!name) {
      failedRows.push({ row: rowNo, reason: "Missing required field: name." });
      return;
    }
    const frequency = parseFrequency(row.frequency);
    if (!frequency) {
      failedRows.push({ row: rowNo, reason: "Invalid frequency. Use daily/weekly/monthly/quarterly/yearly." });
      return;
    }
    const nextDue = (row.next_due_date ?? "").trim();
    const nextRunDate = nextDue || new Date().toISOString().slice(0, 10);
    const assetName = (row.asset_name ?? "").trim();
    const assetId = assetName ? assetByName.get(norm(assetName)) ?? null : null;
    if (assetName && !assetId) {
      warnings.push({ row: rowNo, reason: "Asset not resolved; plan imported without asset link." });
    }
    inserts.push({
      tenant_id: scope.tenantId,
      company_id: scope.companyId,
      asset_id: assetId,
      name,
      frequency_type: frequency,
      frequency_interval: 1,
      start_date: nextRunDate,
      next_run_date: nextRunDate,
      auto_create_work_order: true,
      instructions: (row.checklist ?? "").trim() || null,
      status: "active",
      priority: "medium",
    });
  });
  if (inserts.length > 0) {
    const { error } = await scope.supabase.from("preventive_maintenance_plans").insert(inserts);
    if (error) return { error: error.message };
  }
  return { success: `Imported ${inserts.length} PM plans.`, successCount: inserts.length, failedRows, warnings };
}

async function importInventoryDataset(scope: Scope, rows: CsvRow[]): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];
  let successCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const rowNo = index + 2;
    const row = rows[index];
    const partName = (row.part_name ?? "").trim();
    const sku = (row.sku ?? "").trim() || null;
    const qty = parsePositiveInt(row.quantity);
    const locationName = (row.location_name ?? "").trim();
    if (!partName || !locationName) {
      failedRows.push({ row: rowNo, reason: "Missing required fields: part_name and location_name." });
      continue;
    }

    const { data: existingProduct } = await scope.supabase
      .from("products")
      .select("id")
      .eq("company_id", scope.companyId)
      .eq("name", partName)
      .limit(1)
      .maybeSingle();
    const productId =
      (existingProduct as { id?: string } | null)?.id ??
      (
        await scope.supabase
          .from("products")
          .insert({ company_id: scope.companyId, name: partName, sku, active: true })
          .select("id")
          .single()
      ).data?.id;
    if (!productId) {
      failedRows.push({ row: rowNo, reason: "Failed to create/find product." });
      continue;
    }

    const { data: existingLocation } = await scope.supabase
      .from("stock_locations")
      .select("id")
      .eq("company_id", scope.companyId)
      .eq("name", locationName)
      .limit(1)
      .maybeSingle();
    const locationId =
      (existingLocation as { id?: string } | null)?.id ??
      (
        await scope.supabase
          .from("stock_locations")
          .insert({
            company_id: scope.companyId,
            name: locationName,
            location_type: "warehouse",
            active: true,
            is_default: false,
          })
          .select("id")
          .single()
      ).data?.id;
    if (!locationId) {
      failedRows.push({ row: rowNo, reason: "Failed to create/find stock location." });
      continue;
    }

    if (qty > 0) {
      const { error } = await scope.supabase.rpc("record_inventory_transaction", {
        p_company_id: scope.companyId,
        p_product_id: productId,
        p_stock_location_id: locationId,
        p_quantity_change: qty,
        p_transaction_type: "adjustment",
        p_reference_type: "onboarding_import",
        p_reference_id: null,
        p_notes: "Imported during onboarding",
        p_idempotency_key: null,
      });
      if (error) {
        failedRows.push({ row: rowNo, reason: error.message });
        continue;
      }
    } else {
      warnings.push({ row: rowNo, reason: "Quantity was 0; product/location created without stock increase." });
    }
    successCount += 1;
  }
  return { success: `Imported ${successCount} inventory rows.`, successCount, failedRows, warnings };
}

async function importVendorsDataset(scope: Scope, rows: CsvRow[]): Promise<OnboardingDatasetImportState> {
  const failedRows: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];
  const inserts: Record<string, unknown>[] = [];
  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const vendorName = (row.vendor_name ?? "").trim();
    if (!vendorName) {
      failedRows.push({ row: rowNo, reason: "Missing required field: vendor_name." });
      return;
    }
    inserts.push({
      company_id: scope.companyId,
      name: vendorName,
      contact_name: (row.contact_name ?? "").trim() || null,
      email: (row.email ?? "").trim().toLowerCase() || null,
      phone: (row.phone ?? "").trim() || null,
      service_type: (row.service_type ?? "").trim() || null,
    });
  });
  if (inserts.length > 0) {
    const { error } = await scope.supabase.from("vendors").insert(inserts);
    if (error) return { error: error.message };
  }
  return { success: `Imported ${inserts.length} vendors.`, successCount: inserts.length, failedRows, warnings };
}

export async function importOnboardingDatasetAction(
  _prev: OnboardingDatasetImportState,
  formData: FormData
): Promise<OnboardingDatasetImportState> {
  const scope = await resolveScope();
  if (!scope) return { error: "Unauthorized." };
  const dataset = ((formData.get("dataset") as string | null) ?? "").trim() as OnboardingImportDataset;
  const payloadRaw = ((formData.get("rows_payload") as string | null) ?? "").trim();
  if (!payloadRaw) return { error: "No parsed rows found to import." };
  let rows: CsvRow[] = [];
  try {
    rows = JSON.parse(payloadRaw) as CsvRow[];
  } catch {
    return { error: "Invalid import payload." };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No rows to import." };

  let result: OnboardingDatasetImportState;
  if (dataset === "work_orders") {
    result = await importWorkOrdersDataset(scope, rows);
  } else if (dataset === "technicians") {
    const mode = ((formData.get("technician_mode") as string | null) ?? "technician_only").trim();
    result = await importTechniciansDataset(scope, rows, mode === "technician_with_login");
  } else if (dataset === "pm_schedules") {
    result = await importPmDataset(scope, rows);
  } else if (dataset === "inventory") {
    result = await importInventoryDataset(scope, rows);
  } else if (dataset === "vendors") {
    result = await importVendorsDataset(scope, rows);
  } else {
    return { error: "Invalid dataset." };
  }

  revalidatePath("/onboarding-wizard");
  return result;
}
