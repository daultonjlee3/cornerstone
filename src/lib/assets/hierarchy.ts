type SupabaseLike = {
  from: (table: string) => any;
};

const MAX_HIERARCHY_DEPTH = 25;

export type AssetHierarchyNode = {
  id: string;
  tenant_id: string | null;
  company_id: string;
  parent_asset_id: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  asset_name: string | null;
  name: string | null;
};

export type ResolvedAssetLocation = {
  asset: AssetHierarchyNode;
  parentAsset: AssetHierarchyNode | null;
  effectivePropertyId: string | null;
  effectiveBuildingId: string | null;
  effectiveUnitId: string | null;
  inheritedFromParent: boolean;
  inheritedFromAssetId: string | null;
};

function toAssetHierarchyNode(row: Record<string, unknown>): AssetHierarchyNode {
  return {
    id: row.id as string,
    tenant_id: (row.tenant_id as string | null) ?? null,
    company_id: row.company_id as string,
    parent_asset_id: (row.parent_asset_id as string | null) ?? null,
    property_id: (row.property_id as string | null) ?? null,
    building_id: (row.building_id as string | null) ?? null,
    unit_id: (row.unit_id as string | null) ?? null,
    asset_name: (row.asset_name as string | null) ?? null,
    name: (row.name as string | null) ?? null,
  };
}

export async function getAssetHierarchyNode(
  supabase: SupabaseLike,
  assetId: string
): Promise<AssetHierarchyNode | null> {
  const { data } = await supabase
    .from("assets")
    .select("id, tenant_id, company_id, parent_asset_id, property_id, building_id, unit_id, asset_name, name")
    .eq("id", assetId)
    .maybeSingle();
  if (!data) return null;
  return toAssetHierarchyNode(data as Record<string, unknown>);
}

export async function wouldCreateAssetCycle(
  supabase: SupabaseLike,
  assetId: string,
  candidateParentAssetId: string
): Promise<boolean> {
  if (!assetId || !candidateParentAssetId) return false;
  if (assetId === candidateParentAssetId) return true;

  const visited = new Set<string>([assetId]);
  let currentId: string | null = candidateParentAssetId;
  let depth = 0;

  while (currentId && depth < MAX_HIERARCHY_DEPTH) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    const node = await getAssetHierarchyNode(supabase, currentId);
    if (!node) return false;
    if (node.parent_asset_id === assetId) return true;
    currentId = node.parent_asset_id;
    depth += 1;
  }

  return depth >= MAX_HIERARCHY_DEPTH;
}

export async function resolveAssetLocation(
  supabase: SupabaseLike,
  assetId: string
): Promise<ResolvedAssetLocation | null> {
  const asset = await getAssetHierarchyNode(supabase, assetId);
  if (!asset) return null;

  let effectivePropertyId = asset.property_id;
  let effectiveBuildingId = asset.building_id;
  let effectiveUnitId = asset.unit_id;
  let inheritedFromParent = false;
  let inheritedFromAssetId: string | null = null;
  let parentAsset: AssetHierarchyNode | null = null;

  let currentParentId = asset.parent_asset_id;
  const visited = new Set<string>([asset.id]);
  let depth = 0;

  while (
    currentParentId &&
    depth < MAX_HIERARCHY_DEPTH &&
    (!effectivePropertyId || !effectiveBuildingId || !effectiveUnitId)
  ) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent = await getAssetHierarchyNode(supabase, currentParentId);
    if (!parent) break;
    if (!parentAsset) parentAsset = parent;

    const beforeProperty = effectivePropertyId;
    const beforeBuilding = effectiveBuildingId;
    const beforeUnit = effectiveUnitId;

    effectivePropertyId = effectivePropertyId ?? parent.property_id;
    effectiveBuildingId = effectiveBuildingId ?? parent.building_id;
    effectiveUnitId = effectiveUnitId ?? parent.unit_id;

    if (
      beforeProperty !== effectivePropertyId ||
      beforeBuilding !== effectiveBuildingId ||
      beforeUnit !== effectiveUnitId
    ) {
      inheritedFromParent = true;
      inheritedFromAssetId = parent.id;
    }

    currentParentId = parent.parent_asset_id;
    depth += 1;
  }

  return {
    asset,
    parentAsset,
    effectivePropertyId,
    effectiveBuildingId,
    effectiveUnitId,
    inheritedFromParent,
    inheritedFromAssetId,
  };
}
