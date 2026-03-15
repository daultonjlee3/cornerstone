/**
 * Maps asset category/type names to Pexels search queries for equipment images.
 * One image per category is fetched during demo seed and reused across all assets of that type.
 * Extend this map when adding new asset types.
 */

export const ASSET_TYPE_TO_PEXELS_QUERY: Record<string, string> = {
  HVAC: "rooftop hvac unit",
  Boiler: "industrial boiler system",
  Pump: "industrial pump",
  Fan: "industrial ventilation fan",
  Electrical: "electrical control panel",
  "Electrical Panel": "electrical control panel",
  Generator: "backup generator",
  Elevator: "commercial elevator machinery",
  Lighting: "industrial lighting fixture",
  "Fire Safety": "fire alarm control panel",
  Plumbing: "industrial plumbing",
  Security: "security control panel",
  Roofing: "commercial roofing hvac",
  Appliance: "commercial appliance",
  Compressor: "industrial air compressor",
  "Cooling Tower": "cooling tower",
  Conveyor: "industrial conveyor system",
  "Air Handler": "commercial air handler",
  Component: "industrial control panel",
  Other: "industrial equipment",
};

/**
 * Returns the Pexels search query for an asset type, or a generic fallback.
 */
export function getPexelsQueryForAssetType(assetType: string | null | undefined): string {
  if (!assetType || !assetType.trim()) return "industrial equipment";
  const normalized = assetType.trim();
  return ASSET_TYPE_TO_PEXELS_QUERY[normalized] ?? `${normalized} equipment`;
}
