"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";

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
