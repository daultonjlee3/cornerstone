import type { SupabaseClient } from "@supabase/supabase-js";
import { insertTelematicsBatch, type TelematicsWebhookEvent } from "@/src/lib/integrations/ingest/telematics-insert";
import type { SamsaraVehicleLocation } from "./client";

function mapSamsaraLocation(loc: SamsaraVehicleLocation): TelematicsWebhookEvent | null {
  const lat = loc.location?.latitude;
  const lng = loc.location?.longitude;
  const time = loc.location?.time;
  if (lat == null || lng == null || !time) return null;

  const engineValue = loc.engineState?.value?.toLowerCase();
  const engineOn = engineValue ? engineValue !== "off" : null;

  return {
    external_truck_id: String(loc.id),
    recorded_at: time,
    latitude: lat,
    longitude: lng,
    external_event_id: `${loc.id}-${time}`,
    speed_mph: loc.location?.speed != null ? loc.location.speed * 2.23694 : undefined,
    heading_deg: loc.location?.heading,
    engine_on: engineOn ?? undefined,
    idle: engineValue === "idle" ? true : engineValue === "off" ? false : undefined,
  };
}

export async function syncSamsaraPositions(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    locations: SamsaraVehicleLocation[];
  }
) {
  const events: TelematicsWebhookEvent[] = [];
  for (const loc of input.locations) {
    const mapped = mapSamsaraLocation(loc);
    if (mapped) events.push(mapped);
  }

  return insertTelematicsBatch(supabase, {
    tenantId: input.tenantId,
    connectionId: input.connectionId,
    source: "samsara",
    events,
  });
}

export async function backfillSamsaraPositions(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    locations: SamsaraVehicleLocation[];
  }
) {
  const events: TelematicsWebhookEvent[] = [];
  for (const loc of input.locations) {
    const mapped = mapSamsaraLocation(loc);
    if (mapped) events.push(mapped);
  }

  return insertTelematicsBatch(supabase, {
    tenantId: input.tenantId,
    connectionId: input.connectionId,
    source: "backfill",
    events,
    maxBatch: 500,
  });
}
