type LocationHierarchyInput = {
  companyId: string;
  propertyId?: string | null;
  buildingId?: string | null;
  unitId?: string | null;
};

export async function validateLocationHierarchy(
  supabase: { from: (table: string) => any },
  input: LocationHierarchyInput
): Promise<string | null> {
  const propertyId = input.propertyId ?? null;
  const buildingId = input.buildingId ?? null;
  const unitId = input.unitId ?? null;

  if (propertyId) {
    const { data: property } = await supabase
      .from("properties")
      .select("id, company_id")
      .eq("id", propertyId)
      .maybeSingle();
    if (!property) return "Selected property was not found.";
    if ((property as { company_id: string }).company_id !== input.companyId) {
      return "Selected property does not belong to the selected company.";
    }
  }

  if (buildingId) {
    const { data: building } = await supabase
      .from("buildings")
      .select("id, property_id")
      .eq("id", buildingId)
      .maybeSingle();
    if (!building) return "Selected building was not found.";
    if (!propertyId) return "Please select a property when selecting a building.";
    if ((building as { property_id: string }).property_id !== propertyId) {
      return "Selected building does not belong to the selected property.";
    }
  }

  if (unitId) {
    const { data: unit } = await supabase
      .from("units")
      .select("id, building_id")
      .eq("id", unitId)
      .maybeSingle();
    if (!unit) return "Selected unit was not found.";
    if (!buildingId) return "Please select a building when selecting a unit.";
    if ((unit as { building_id: string }).building_id !== buildingId) {
      return "Selected unit does not belong to the selected building.";
    }
  }

  return null;
}
