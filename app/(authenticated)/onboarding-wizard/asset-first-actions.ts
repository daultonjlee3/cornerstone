"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export type AssetImportRowInput = {
  property: string;
  building: string;
  asset_name: string;
  asset_type?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  install_date?: string | null;
  location?: string | null;
  notes?: string | null;
  criticality?: string | null;
};

export type AssetImportSummary = {
  rowsReceived: number;
  rowsProcessed: number;
  rowsSkippedMissingRequired: number;
  rowsSkippedDuplicate: number;
  propertiesCreated: number;
  buildingsCreated: number;
  assetsImported: number;
};

export type AssetImportState = {
  error?: string;
  success?: string;
  summary?: AssetImportSummary;
};

export type DemoDataSummary = {
  propertiesCreated: number;
  buildingsCreated: number;
  assetsImported: number;
  techniciansCreated: number;
  workOrdersCreated: number;
  inventoryItemsPrepared: number;
};

export type DemoDataState = {
  error?: string;
  success?: string;
  summary?: DemoDataSummary;
};

type Scope = {
  userId: string;
  tenantId: string;
  companyId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

const IMPORT_BATCH_SIZE = 500;
const QUERY_CHUNK_SIZE = 200;
const PAGE_SIZE = 1000;

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeCriticality(value: string | null | undefined): "low" | "medium" | "high" | "critical" {
  const normalized = normalizeKey(value);
  if (
    normalized === "critical" ||
    normalized === "crit" ||
    normalized === "emergency" ||
    normalized === "urgent"
  ) {
    return "critical";
  }
  if (normalized === "high" || normalized === "h") return "high";
  if (normalized === "low" || normalized === "l") return "low";
  if (normalized === "medium" || normalized === "med" || normalized === "normal") return "medium";
  return "medium";
}

function parseOptionalDate(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

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

async function insertInBatches(
  scope: Scope,
  table:
    | "properties"
    | "buildings"
    | "assets"
    | "technicians"
    | "products"
    | "work_orders"
    | "inventory_balances",
  rows: Record<string, unknown>[],
  selectColumns?: string
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return [];
  const inserted: Record<string, unknown>[] = [];
  for (const batch of chunkArray(rows, IMPORT_BATCH_SIZE)) {
    const query = scope.supabase.from(table).insert(batch);
    const { data, error } = selectColumns
      ? await query.select(selectColumns)
      : await query.select();
    if (error) throw new Error(error.message);
    inserted.push(...((data ?? []) as Record<string, unknown>[]));
  }
  return inserted;
}

async function selectExistingProperties(scope: Scope): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await scope.supabase
      .from("properties")
      .select("id, name, property_name")
      .eq("company_id", scope.companyId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function selectExistingBuildings(
  scope: Scope,
  propertyIds: string[]
): Promise<Record<string, unknown>[]> {
  if (propertyIds.length === 0) return [];
  const rows: Record<string, unknown>[] = [];
  for (const propertyChunk of chunkArray(propertyIds, QUERY_CHUNK_SIZE)) {
    let from = 0;
    while (true) {
      const { data, error } = await scope.supabase
        .from("buildings")
        .select("id, property_id, name, building_name")
        .in("property_id", propertyChunk)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return rows;
}

async function selectExistingAssets(
  scope: Scope,
  buildingIds: string[]
): Promise<Record<string, unknown>[]> {
  if (buildingIds.length === 0) return [];
  const rows: Record<string, unknown>[] = [];
  for (const buildingChunk of chunkArray(buildingIds, QUERY_CHUNK_SIZE)) {
    let from = 0;
    while (true) {
      const { data, error } = await scope.supabase
        .from("assets")
        .select("id, property_id, building_id, name, asset_name, serial_number")
        .eq("company_id", scope.companyId)
        .in("building_id", buildingChunk)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return rows;
}

function parseRowsPayload(formData: FormData): AssetImportRowInput[] {
  const raw = (formData.get("rows_payload") as string | null) ?? "";
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid import payload.");
  }
  return parsed.map((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    return {
      property: String(row.property ?? "").trim(),
      building: String(row.building ?? "").trim(),
      asset_name: String(row.asset_name ?? "").trim(),
      asset_type: String(row.asset_type ?? "").trim() || null,
      manufacturer: String(row.manufacturer ?? "").trim() || null,
      model: String(row.model ?? "").trim() || null,
      serial_number: String(row.serial_number ?? "").trim() || null,
      install_date: String(row.install_date ?? "").trim() || null,
      location: String(row.location ?? "").trim() || null,
      notes: String(row.notes ?? "").trim() || null,
      criticality: String(row.criticality ?? "").trim() || null,
    };
  });
}

async function performAssetImport(scope: Scope, rows: AssetImportRowInput[]): Promise<AssetImportSummary> {
  const rowsReceived = rows.length;
  const validRows = rows.filter(
    (row) => row.property.trim() && row.building.trim() && row.asset_name.trim()
  );
  const rowsSkippedMissingRequired = rowsReceived - validRows.length;

  const propertyNameByKey = new Map<string, string>();
  for (const row of validRows) {
    const key = normalizeKey(row.property);
    if (key && !propertyNameByKey.has(key)) propertyNameByKey.set(key, row.property.trim());
  }

  const existingProperties = await selectExistingProperties(scope);
  const propertyIdByKey = new Map<string, string>();
  for (const property of existingProperties) {
    const id = String(property.id ?? "");
    const keyFromPropertyName = normalizeKey((property.property_name as string | null) ?? null);
    const keyFromName = normalizeKey((property.name as string | null) ?? null);
    if (id && keyFromPropertyName) propertyIdByKey.set(keyFromPropertyName, id);
    if (id && keyFromName) propertyIdByKey.set(keyFromName, id);
  }

  const missingProperties: Record<string, unknown>[] = [];
  for (const [key, displayName] of propertyNameByKey.entries()) {
    if (propertyIdByKey.has(key)) continue;
    missingProperties.push({
      company_id: scope.companyId,
      name: displayName,
      property_name: displayName,
      status: "active",
    });
  }
  const insertedProperties = await insertInBatches(
    scope,
    "properties",
    missingProperties,
    "id, name, property_name"
  );
  for (const inserted of insertedProperties) {
    const id = String(inserted.id ?? "");
    const keyFromPropertyName = normalizeKey((inserted.property_name as string | null) ?? null);
    const keyFromName = normalizeKey((inserted.name as string | null) ?? null);
    if (id && keyFromPropertyName) propertyIdByKey.set(keyFromPropertyName, id);
    if (id && keyFromName) propertyIdByKey.set(keyFromName, id);
  }

  const buildingNameByKey = new Map<string, { propertyId: string; buildingName: string }>();
  for (const row of validRows) {
    const propertyKey = normalizeKey(row.property);
    const buildingKey = normalizeKey(row.building);
    const propertyId = propertyIdByKey.get(propertyKey) ?? null;
    if (!propertyId || !buildingKey) continue;
    const compositeKey = `${propertyId}::${buildingKey}`;
    if (!buildingNameByKey.has(compositeKey)) {
      buildingNameByKey.set(compositeKey, { propertyId, buildingName: row.building.trim() });
    }
  }

  const existingBuildings = await selectExistingBuildings(
    scope,
    Array.from(new Set(Array.from(buildingNameByKey.values()).map((item) => item.propertyId)))
  );
  const buildingIdByKey = new Map<string, string>();
  for (const building of existingBuildings) {
    const id = String(building.id ?? "");
    const propertyId = String(building.property_id ?? "");
    const nameKey = normalizeKey((building.building_name as string | null) ?? (building.name as string | null) ?? null);
    if (id && propertyId && nameKey) {
      buildingIdByKey.set(`${propertyId}::${nameKey}`, id);
    }
  }

  const missingBuildings: Record<string, unknown>[] = [];
  for (const [key, value] of buildingNameByKey.entries()) {
    if (buildingIdByKey.has(key)) continue;
    missingBuildings.push({
      tenant_id: scope.tenantId,
      property_id: value.propertyId,
      name: value.buildingName,
      building_name: value.buildingName,
      status: "active",
    });
  }
  const insertedBuildings = await insertInBatches(
    scope,
    "buildings",
    missingBuildings,
    "id, property_id, name, building_name"
  );
  for (const inserted of insertedBuildings) {
    const id = String(inserted.id ?? "");
    const propertyId = String(inserted.property_id ?? "");
    const nameKey = normalizeKey((inserted.building_name as string | null) ?? (inserted.name as string | null) ?? null);
    if (id && propertyId && nameKey) {
      buildingIdByKey.set(`${propertyId}::${nameKey}`, id);
    }
  }

  const existingAssets = await selectExistingAssets(
    scope,
    Array.from(new Set(Array.from(buildingIdByKey.values())))
  );
  const existingAssetKeys = new Set<string>();
  for (const asset of existingAssets) {
    const propertyId = String(asset.property_id ?? "");
    const buildingId = String(asset.building_id ?? "");
    const serialKey = normalizeKey((asset.serial_number as string | null) ?? null);
    const nameKey = normalizeKey((asset.asset_name as string | null) ?? (asset.name as string | null) ?? null);
    if (buildingId && serialKey) existingAssetKeys.add(`${buildingId}::serial::${serialKey}`);
    if (propertyId && buildingId && nameKey) {
      existingAssetKeys.add(`${propertyId}::${buildingId}::name::${nameKey}`);
    }
  }

  const pendingAssetRows: Record<string, unknown>[] = [];
  let rowsSkippedDuplicate = 0;
  const seenIncomingKeys = new Set<string>();
  for (const row of validRows) {
    const propertyId = propertyIdByKey.get(normalizeKey(row.property)) ?? null;
    if (!propertyId) continue;
    const buildingId =
      buildingIdByKey.get(`${propertyId}::${normalizeKey(row.building)}`) ?? null;
    if (!buildingId) continue;

    const serialKey = normalizeKey(row.serial_number);
    const nameKey = normalizeKey(row.asset_name);
    const dedupeKey = serialKey
      ? `${buildingId}::serial::${serialKey}`
      : `${propertyId}::${buildingId}::name::${nameKey}`;
    if (existingAssetKeys.has(dedupeKey) || seenIncomingKeys.has(dedupeKey)) {
      rowsSkippedDuplicate += 1;
      continue;
    }
    seenIncomingKeys.add(dedupeKey);
    pendingAssetRows.push({
      tenant_id: scope.tenantId,
      company_id: scope.companyId,
      property_id: propertyId,
      building_id: buildingId,
      name: row.asset_name,
      asset_name: row.asset_name,
      asset_type: row.asset_type || null,
      manufacturer: row.manufacturer || null,
      model: row.model || null,
      serial_number: row.serial_number || null,
      install_date: parseOptionalDate(row.install_date),
      location: row.location || null,
      notes: row.notes || null,
      criticality: normalizeCriticality(row.criticality),
      status: "active",
    });
  }

  await insertInBatches(scope, "assets", pendingAssetRows, "id");

  return {
    rowsReceived,
    rowsProcessed: validRows.length,
    rowsSkippedMissingRequired,
    rowsSkippedDuplicate,
    propertiesCreated: insertedProperties.length,
    buildingsCreated: insertedBuildings.length,
    assetsImported: pendingAssetRows.length,
  };
}

async function ensureDefaultStockLocation(scope: Scope): Promise<string> {
  const { data: existing } = await scope.supabase
    .from("stock_locations")
    .select("id")
    .eq("company_id", scope.companyId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await scope.supabase
    .from("stock_locations")
    .insert({
      company_id: scope.companyId,
      name: "Main Warehouse",
      location_type: "warehouse",
      active: true,
      is_default: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

export async function importAssetSpreadsheetAction(
  _prev: AssetImportState,
  formData: FormData
): Promise<AssetImportState> {
  void _prev;
  const scope = await resolveScope();
  if (!scope) return { error: "Unauthorized." };

  let rows: AssetImportRowInput[] = [];
  try {
    rows = parseRowsPayload(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid import payload.",
    };
  }

  if (rows.length === 0) {
    return { error: "No mapped rows found to import." };
  }

  if (rows.length > 8000) {
    return { error: "Import payload too large. Split into batches of 8,000 rows or fewer." };
  }

  try {
    const summary = await performAssetImport(scope, rows);
    revalidatePath("/onboarding-wizard");
    revalidatePath("/properties");
    revalidatePath("/buildings");
    revalidatePath("/assets");
    return {
      success: "Import Complete",
      summary,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to import assets.",
    };
  }
}

export async function generateDemoDataAction(
  _prev: DemoDataState,
  _formData: FormData
): Promise<DemoDataState> {
  void _prev;
  void _formData;
  const scope = await resolveScope();
  if (!scope) return { error: "Unauthorized." };

  const demoRows: AssetImportRowInput[] = [];
  const propertyBuildingPairs: Array<{ property: string; building: string }> = [
    { property: "Sunset Towers", building: "Building A" },
    { property: "Sunset Towers", building: "Building B" },
    { property: "Lakeside Commons", building: "North Wing" },
    { property: "Lakeside Commons", building: "South Wing" },
    { property: "Harbor View Plaza", building: "East Block" },
    { property: "Harbor View Plaza", building: "West Block" },
  ];

  const assetSeeds = [
    { name: "AHU-1", type: "HVAC" },
    { name: "Boiler 1", type: "Boiler" },
    { name: "Cooling Tower Pump", type: "Pump" },
    { name: "Roof Exhaust Fan", type: "Fan" },
    { name: "Electrical Panel A", type: "Electrical" },
  ];

  let seedIndex = 0;
  for (const pair of propertyBuildingPairs) {
    for (const seed of assetSeeds) {
      const indexLabel = String(seedIndex + 1).padStart(2, "0");
      demoRows.push({
        property: pair.property,
        building: pair.building,
        asset_name: `${seed.name} ${indexLabel}`,
        asset_type: seed.type,
        manufacturer: "Cornerstone Industrial",
        model: `M-${indexLabel}`,
        serial_number: `SER-${indexLabel}-${pair.building.replace(/\s+/g, "").toUpperCase()}`,
        install_date: "2021-01-15",
        location: `${pair.building} Mechanical Room`,
        notes: "Generated demo asset",
        criticality: seedIndex % 7 === 0 ? "Critical" : seedIndex % 3 === 0 ? "High" : "Medium",
      });
      seedIndex += 1;
    }
  }

  try {
    const importSummary = await performAssetImport(scope, demoRows);
    const hierarchyExamples: Array<{
      property: string;
      building: string;
      parentName: string;
      parentType: string;
      children: string[];
    }> = [
      {
        property: "Sunset Towers",
        building: "Building A",
        parentName: "RTU-4",
        parentType: "HVAC",
        children: ["Compressor A", "Fan Motor", "Thermostat Controller"],
      },
      {
        property: "Lakeside Commons",
        building: "North Wing",
        parentName: "Generator G-1",
        parentType: "Generator",
        children: ["Battery Bank", "Transfer Switch", "Control Module"],
      },
      {
        property: "Harbor View Plaza",
        building: "East Block",
        parentName: "Elevator E-2",
        parentType: "Elevator",
        children: ["Door Operator", "Motor Assembly", "Control Panel"],
      },
    ];
    const { data: propertiesForHierarchy } = await scope.supabase
      .from("properties")
      .select("id, property_name, name")
      .eq("company_id", scope.companyId);
    const propertyIdByName = new Map<string, string>();
    for (const property of (propertiesForHierarchy ?? []) as Array<Record<string, unknown>>) {
      const id = String(property.id ?? "");
      if (!id) continue;
      const keys = [
        normalizeKey((property.property_name as string | null) ?? null),
        normalizeKey((property.name as string | null) ?? null),
      ].filter(Boolean);
      for (const key of keys) {
        propertyIdByName.set(key, id);
      }
    }
    const { data: buildingsForHierarchy } = await scope.supabase
      .from("buildings")
      .select("id, property_id, building_name, name");
    const buildingIdByKey = new Map<string, string>();
    for (const building of (buildingsForHierarchy ?? []) as Array<Record<string, unknown>>) {
      const id = String(building.id ?? "");
      const propertyId = String(building.property_id ?? "");
      if (!id || !propertyId) continue;
      const keys = [
        normalizeKey((building.building_name as string | null) ?? null),
        normalizeKey((building.name as string | null) ?? null),
      ].filter(Boolean);
      for (const key of keys) {
        buildingIdByKey.set(`${propertyId}::${key}`, id);
      }
    }
    const { data: assetsForHierarchyRaw } = await scope.supabase
      .from("assets")
      .select("id, asset_name, name, parent_asset_id, property_id, building_id")
      .eq("company_id", scope.companyId);
    const assetsForHierarchy = (assetsForHierarchyRaw ?? []) as Array<Record<string, unknown>>;
    const findAsset = (assetName: string, buildingId: string | null, parentAssetId: string | null) =>
      assetsForHierarchy.find((asset) => {
        const currentName = normalizeKey(
          (asset.asset_name as string | null) ?? (asset.name as string | null) ?? null
        );
        if (currentName !== normalizeKey(assetName)) return false;
        const currentBuildingId = (asset.building_id as string | null) ?? null;
        const currentParentId = (asset.parent_asset_id as string | null) ?? null;
        return currentBuildingId === buildingId && currentParentId === parentAssetId;
      });

    const parentRowsToInsert: Record<string, unknown>[] = [];
    for (const example of hierarchyExamples) {
      const propertyId = propertyIdByName.get(normalizeKey(example.property)) ?? null;
      const buildingId = propertyId
        ? buildingIdByKey.get(`${propertyId}::${normalizeKey(example.building)}`) ?? null
        : null;
      const existingParent = findAsset(example.parentName, buildingId, null);
      if (existingParent) continue;
      parentRowsToInsert.push({
        tenant_id: scope.tenantId,
        company_id: scope.companyId,
        property_id: propertyId,
        building_id: buildingId,
        unit_id: null,
        parent_asset_id: null,
        name: example.parentName,
        asset_name: example.parentName,
        asset_type: example.parentType,
        manufacturer: "Cornerstone Industrial",
        model: "Demo Platform",
        status: "active",
        notes: "Generated demo parent asset",
      });
    }
    const insertedParents = await insertInBatches(
      scope,
      "assets",
      parentRowsToInsert,
      "id, asset_name, name, parent_asset_id, property_id, building_id"
    );
    if (insertedParents.length > 0) {
      assetsForHierarchy.push(...insertedParents);
    }

    const childRowsToInsert: Record<string, unknown>[] = [];
    for (const example of hierarchyExamples) {
      const propertyId = propertyIdByName.get(normalizeKey(example.property)) ?? null;
      const buildingId = propertyId
        ? buildingIdByKey.get(`${propertyId}::${normalizeKey(example.building)}`) ?? null
        : null;
      const parentAsset = findAsset(example.parentName, buildingId, null);
      const parentAssetId = parentAsset ? String(parentAsset.id ?? "") : "";
      if (!parentAssetId) continue;
      for (const childName of example.children) {
        const existingChild = findAsset(childName, null, parentAssetId);
        if (existingChild) continue;
        childRowsToInsert.push({
          tenant_id: scope.tenantId,
          company_id: scope.companyId,
          parent_asset_id: parentAssetId,
          property_id: null,
          building_id: null,
          unit_id: null,
          name: childName,
          asset_name: childName,
          asset_type: "Component",
          manufacturer: "Cornerstone Industrial",
          model: "Demo Component",
          status: "active",
          notes: `Generated demo sub-asset for ${example.parentName}`,
        });
      }
    }
    const insertedChildren = await insertInBatches(scope, "assets", childRowsToInsert, "id");
    const hierarchyAssetsInserted = insertedParents.length + insertedChildren.length;

    const technicianNames = [
      "Maria Gomez",
      "Ravi Patel",
      "Liam Chen",
      "Sofia Nguyen",
      "Marcus Reed",
    ];
    const { data: existingTechnicians } = await scope.supabase
      .from("technicians")
      .select("id, technician_name, name")
      .eq("company_id", scope.companyId);
    const existingTechnicianKeys = new Set(
      ((existingTechnicians ?? []) as Array<Record<string, unknown>>).map((row) =>
        normalizeKey(
          (row.technician_name as string | null) ?? (row.name as string | null) ?? null
        )
      )
    );
    const techniciansToInsert = technicianNames
      .filter((name) => !existingTechnicianKeys.has(normalizeKey(name)))
      .map((name) => ({
        tenant_id: scope.tenantId,
        company_id: scope.companyId,
        name,
        technician_name: name,
        status: "active",
        trade: "General Maintenance",
      }));
    const insertedTechnicians = await insertInBatches(
      scope,
      "technicians",
      techniciansToInsert,
      "id"
    );

    const defaultStockLocationId = await ensureDefaultStockLocation(scope);
    const productSeeds = [
      { name: "MERV 8 Air Filter 20x20", sku: "FLT-2020-M8", quantity: 42 },
      { name: "Fan Belt 3L290", sku: "BLT-3L290", quantity: 28 },
      { name: "Grease Cartridge", sku: "GRS-CART", quantity: 60 },
      { name: "Boiler Gasket Kit", sku: "GSK-BOIL", quantity: 12 },
      { name: "Pump Seal Assembly", sku: "PMP-SEAL", quantity: 16 },
      { name: "Vibration Sensor", sku: "SNS-VIB", quantity: 24 },
      { name: "Electrical Breaker 20A", sku: "ELC-BRK20", quantity: 30 },
      { name: "Thermostat Module", sku: "THR-MOD", quantity: 18 },
      { name: "Motor Coupling", sku: "MTR-CPL", quantity: 20 },
      { name: "Condenser Coil Cleaner", sku: "CLN-COIL", quantity: 26 },
    ];

    const { data: existingProducts } = await scope.supabase
      .from("products")
      .select("id, sku")
      .eq("company_id", scope.companyId);
    const productIdBySku = new Map<string, string>();
    for (const product of (existingProducts ?? []) as Array<Record<string, unknown>>) {
      const sku = String(product.sku ?? "");
      const id = String(product.id ?? "");
      if (sku && id) productIdBySku.set(sku, id);
    }

    const productsToInsert = productSeeds
      .filter((seed) => !productIdBySku.has(seed.sku))
      .map((seed) => ({
        company_id: scope.companyId,
        name: seed.name,
        sku: seed.sku,
        category: "Maintenance Supplies",
        unit_of_measure: "ea",
        default_cost: 25,
        active: true,
      }));
    const insertedProducts = await insertInBatches(
      scope,
      "products",
      productsToInsert,
      "id, sku"
    );
    for (const product of insertedProducts) {
      const sku = String(product.sku ?? "");
      const id = String(product.id ?? "");
      if (sku && id) productIdBySku.set(sku, id);
    }

    const inventoryBalanceRows = productSeeds
      .map((seed) => {
        const productId = productIdBySku.get(seed.sku) ?? null;
        if (!productId) return null;
        return {
          product_id: productId,
          stock_location_id: defaultStockLocationId,
          quantity_on_hand: seed.quantity,
          minimum_stock: Math.max(2, Math.floor(seed.quantity * 0.2)),
          reorder_point: Math.max(4, Math.floor(seed.quantity * 0.35)),
        };
      })
      .filter(
        (
          row
        ): row is {
          product_id: string;
          stock_location_id: string;
          quantity_on_hand: number;
          minimum_stock: number;
          reorder_point: number;
        } => row !== null
      );
    if (inventoryBalanceRows.length > 0) {
      const { error: balanceError } = await scope.supabase
        .from("inventory_balances")
        .upsert(inventoryBalanceRows, {
          onConflict: "product_id,stock_location_id",
          ignoreDuplicates: false,
        });
      if (balanceError) throw new Error(balanceError.message);
    }

    const { data: allAssets } = await scope.supabase
      .from("assets")
      .select("id, property_id, building_id")
      .eq("company_id", scope.companyId)
      .order("created_at", { ascending: true })
      .limit(120);
    const assets = ((allAssets ?? []) as Array<Record<string, unknown>>).filter(
      (asset) => asset.id && asset.property_id && asset.building_id
    );

    const { data: activeTechnicians } = await scope.supabase
      .from("technicians")
      .select("id")
      .eq("company_id", scope.companyId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    const technicianIds = ((activeTechnicians ?? []) as Array<Record<string, unknown>>)
      .map((row) => String(row.id ?? ""))
      .filter(Boolean);

    const workOrderTitles = [
      "Replace air filter",
      "Inspect boiler pressure",
      "Lubricate pump bearings",
      "Check rooftop fan vibration",
      "Reset tripped breaker",
      "Inspect AHU belts",
      "Calibrate thermostat",
      "Clean condenser coil",
      "Inspect exhaust fan motor",
      "Test emergency lighting",
      "Inspect pump seal leaks",
      "Verify control panel alarms",
      "Perform weekly HVAC walkthrough",
      "Inspect boiler combustion readings",
      "Check chilled water flow",
      "Inspect makeup air unit",
      "Review vibration trend readings",
      "Inspect electrical panel heat load",
      "Replace worn coupling insert",
      "Validate PM checklist completion",
    ];

    const { data: existingDemoWos } = await scope.supabase
      .from("work_orders")
      .select("id, title")
      .eq("company_id", scope.companyId)
      .in(
        "title",
        workOrderTitles.map((title) => `Demo - ${title}`)
      );
    const existingDemoTitleSet = new Set(
      ((existingDemoWos ?? []) as Array<Record<string, unknown>>).map((row) =>
        String(row.title ?? "")
      )
    );

    const priorities = ["low", "medium", "high", "emergency"];
    const statuses = ["new", "scheduled", "in_progress", "completed"];
    const today = new Date();
    const workOrdersToInsert: Record<string, unknown>[] = [];
    for (let index = 0; index < workOrderTitles.length; index += 1) {
      const title = `Demo - ${workOrderTitles[index]}`;
      if (existingDemoTitleSet.has(title)) continue;
      const asset = assets[index % Math.max(1, assets.length)] ?? null;
      const technicianId =
        technicianIds.length > 0 ? technicianIds[index % technicianIds.length] : null;
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + (index % 10));
      const scheduledStart = new Date(scheduledDate);
      scheduledStart.setHours(8 + (index % 6), 0, 0, 0);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setHours(scheduledStart.getHours() + 1);
      const status = statuses[index % statuses.length];
      workOrdersToInsert.push({
        tenant_id: scope.tenantId,
        company_id: scope.companyId,
        property_id: asset ? String(asset.property_id ?? "") : null,
        building_id: asset ? String(asset.building_id ?? "") : null,
        asset_id: asset ? String(asset.id ?? "") : null,
        title,
        description: `Generated demo work order: ${workOrderTitles[index]}.`,
        category: "repair",
        priority: priorities[index % priorities.length],
        status,
        assigned_technician_id: technicianId,
        scheduled_date: scheduledDate.toISOString().slice(0, 10),
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        due_date: scheduledDate.toISOString().slice(0, 10),
        requested_by_name: "Demo Operations",
        requested_at: new Date().toISOString(),
        started_at:
          status === "in_progress" || status === "completed"
            ? scheduledStart.toISOString()
            : null,
        completed_at: status === "completed" ? scheduledEnd.toISOString() : null,
        created_by_user_id: scope.userId,
      });
    }
    const insertedWorkOrders = await insertInBatches(
      scope,
      "work_orders",
      workOrdersToInsert,
      "id"
    );

    revalidatePath("/onboarding-wizard");
    revalidatePath("/properties");
    revalidatePath("/buildings");
    revalidatePath("/assets");
    revalidatePath("/technicians");
    revalidatePath("/inventory");
    revalidatePath("/work-orders");
    revalidatePath("/dispatch");

    const summary: DemoDataSummary = {
      propertiesCreated: importSummary.propertiesCreated,
      buildingsCreated: importSummary.buildingsCreated,
      assetsImported: importSummary.assetsImported + hierarchyAssetsInserted,
      techniciansCreated: insertedTechnicians.length,
      workOrdersCreated: insertedWorkOrders.length,
      inventoryItemsPrepared: inventoryBalanceRows.length,
    };

    return {
      success: "Demo data generated successfully.",
      summary,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate onboarding demo data.",
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
