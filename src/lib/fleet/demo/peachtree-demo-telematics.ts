import type { SupabaseClient } from "@supabase/supabase-js";
import { PEACHTREE_TENANT } from "@/scripts/seed-fleet-demo/constants";
import {
  STAGED_GPS_OFFLINE_UNITS,
  STAGED_GPS_STALE_UNITS,
  DEMO_UNIT_PREFIX,
} from "@/scripts/seed-fleet-demo/scenarios";
import { computeTelematicsStatus } from "@/src/lib/fleet/queries";

export type PeachtreeGpsProfile = "online" | "stale" | "offline";

type TruckTelematicsRow = {
  id: string;
  unit_number: string;
  last_telematics_at: string | null;
};

function unitSuffix(unitNumber: string): string {
  return unitNumber.replace(DEMO_UNIT_PREFIX, "");
}

export function peachtreeGpsProfileForUnit(unitNumber: string): PeachtreeGpsProfile {
  const suffix = unitSuffix(unitNumber);
  if (STAGED_GPS_OFFLINE_UNITS.includes(suffix as (typeof STAGED_GPS_OFFLINE_UNITS)[number])) {
    return "offline";
  }
  if (STAGED_GPS_STALE_UNITS.includes(suffix as (typeof STAGED_GPS_STALE_UNITS)[number])) {
    return "stale";
  }
  return "online";
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Latest ping timestamp for a demo truck — mirrors seed telematics profiles. */
export function peachtreeTargetLastTelematicsAt(
  profile: PeachtreeGpsProfile,
  truckIndex: number
): string {
  switch (profile) {
    case "online":
      return minutesAgoIso(2 + (truckIndex % 5));
    case "stale":
      return minutesAgoIso(18 + (truckIndex % 3));
    case "offline":
      return hoursAgoIso(4 + (truckIndex % 3) * 0.1);
  }
}

export function peachtreeExpectedTelematicsStatus(
  unitNumber: string,
  truckIndex: number
): ReturnType<typeof computeTelematicsStatus> {
  const profile = peachtreeGpsProfileForUnit(unitNumber);
  const target = peachtreeTargetLastTelematicsAt(profile, truckIndex);
  return computeTelematicsStatus(target);
}

/** True when demo GPS staging has decayed (e.g. all trucks read offline after seed). */
export function peachtreeTelematicsNeedsRefresh(trucks: TruckTelematicsRow[]): boolean {
  if (trucks.length === 0) return false;

  let expectedOnline = 0;
  let actualOnline = 0;

  for (let i = 0; i < trucks.length; i++) {
    const truck = trucks[i];
    const profile = peachtreeGpsProfileForUnit(truck.unit_number);
    if (profile !== "online") continue;

    expectedOnline++;
    if (computeTelematicsStatus(truck.last_telematics_at) === "online") {
      actualOnline++;
    }
  }

  if (expectedOnline === 0) return false;
  return actualOnline < Math.max(1, Math.ceil(expectedOnline * 0.5));
}

async function loadPeachtreeTrucks(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TruckTelematicsRow[]> {
  const { data, error } = await supabase
    .from("trucks")
    .select("id, unit_number, last_telematics_at")
    .eq("tenant_id", tenantId)
    .order("unit_number");

  if (error) throw new Error(error.message);
  return (data ?? []) as TruckTelematicsRow[];
}

async function isPeachtreeTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();
  return (data as { slug: string | null } | null)?.slug === PEACHTREE_TENANT.slug;
}

/**
 * Refreshes Peachtree demo truck GPS timestamps when seed-relative telematics have gone stale.
 * Keeps staged offline/stale units while restoring online trucks for recommendations.
 */
export async function ensurePeachtreeDemoTelematicsFresh(
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  if (!(await isPeachtreeTenant(supabase, tenantId))) {
    return false;
  }

  const trucks = await loadPeachtreeTrucks(supabase, tenantId);
  if (!peachtreeTelematicsNeedsRefresh(trucks)) {
    return false;
  }

  await Promise.all(
    trucks.map((truck, index) => {
      const profile = peachtreeGpsProfileForUnit(truck.unit_number);
      const last_telematics_at = peachtreeTargetLastTelematicsAt(profile, index);
      return supabase
        .from("trucks")
        .update({ last_telematics_at })
        .eq("id", truck.id)
        .eq("tenant_id", tenantId);
    })
  );

  return true;
}
