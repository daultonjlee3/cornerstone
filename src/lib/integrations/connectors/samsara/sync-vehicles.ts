import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertExternalMapping } from "@/src/lib/integrations/mappings";
import type { SamsaraVehicle } from "./client";

function normalizeUnitNumber(vehicle: SamsaraVehicle): string | null {
  const name = vehicle.name?.trim();
  if (name) return name;
  const external = vehicle.externalIds;
  if (external) {
    for (const value of Object.values(external)) {
      if (value?.trim()) return value.trim();
    }
  }
  return null;
}

export type VehicleSyncResult = {
  mapped: number;
  created: number;
  unmapped: Array<{ samsaraId: string; name: string | null }>;
};

export async function syncSamsaraVehicles(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    vehicles: SamsaraVehicle[];
  }
): Promise<VehicleSyncResult> {
  const { tenantId, connectionId, vehicles } = input;
  let mapped = 0;
  let created = 0;
  const unmapped: Array<{ samsaraId: string; name: string | null }> = [];

  const { data: branches } = await supabase
    .from("branches")
    .select("id, company_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  const defaultBranch = branches?.[0] as { id: string; company_id: string } | undefined;
  if (!defaultBranch) {
    throw new Error("No active branch found for vehicle sync.");
  }

  for (const vehicle of vehicles) {
    const samsaraId = String(vehicle.id);
    const unitNumber = normalizeUnitNumber(vehicle);

    let truckId: string | null = null;

    if (unitNumber) {
      const { data: existing } = await supabase
        .from("trucks")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("branch_id", defaultBranch.id)
        .eq("unit_number", unitNumber)
        .maybeSingle();
      truckId = (existing as { id?: string } | null)?.id ?? null;
    }

    if (!truckId && unitNumber) {
      const { data: inserted, error } = await supabase
        .from("trucks")
        .insert({
          branch_id: defaultBranch.id,
          company_id: defaultBranch.company_id,
          tenant_id: tenantId,
          unit_number: unitNumber,
          truck_type: "hydrovac",
          telematics_device_id: samsaraId,
        })
        .select("id")
        .single();

      if (!error && inserted?.id) {
        truckId = inserted.id as string;
        created += 1;
      }
    }

    if (truckId) {
      await supabase
        .from("trucks")
        .update({ telematics_device_id: samsaraId })
        .eq("id", truckId)
        .eq("tenant_id", tenantId);

      await upsertExternalMapping(supabase, {
        connectionId,
        tenantId,
        entityType: "truck",
        externalId: samsaraId,
        internalId: truckId,
      });
      mapped += 1;
    } else {
      unmapped.push({ samsaraId, name: vehicle.name ?? null });
    }
  }

  return { mapped, created, unmapped };
}
