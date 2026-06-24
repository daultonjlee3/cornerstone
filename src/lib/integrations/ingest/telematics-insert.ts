import type { SupabaseClient } from "@supabase/supabase-js";
import type { TelematicsEventSource } from "@/src/types/fleet";
import { resolveExternalMapping } from "@/src/lib/integrations/mappings";

export type TelematicsWebhookEvent = {
  external_truck_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  external_event_id?: string;
  speed_mph?: number;
  odometer_miles?: number;
  engine_on?: boolean;
  idle?: boolean;
  heading_deg?: number;
};

export type TelematicsInsertError = { external_truck_id: string; reason: string };

export type TelematicsInsertResult = {
  processed: number;
  failed: number;
  errors: TelematicsInsertError[];
};

async function resolveTruckId(
  supabase: SupabaseClient,
  tenantId: string,
  connectionId: string,
  externalTruckId: string
): Promise<string | null> {
  let truckId: string | null = null;

  const mapped = await resolveExternalMapping(supabase, connectionId, "truck", externalTruckId, tenantId);
  if (mapped) truckId = mapped;

  if (!truckId) {
    const { data } = await supabase
      .from("trucks")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("telematics_device_id", externalTruckId)
      .maybeSingle();
    truckId = (data as { id?: string } | null)?.id ?? null;
  }

  if (!truckId) return null;

  const { data: truck } = await supabase
    .from("trucks")
    .select("id")
    .eq("id", truckId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return truck?.id ? (truck.id as string) : null;
}

function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export async function insertTelematicsEvent(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    source: TelematicsEventSource;
    event: TelematicsWebhookEvent;
    rawPayload?: Record<string, unknown>;
  }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { tenantId, connectionId, source, event } = input;
  const externalTruckId = event.external_truck_id?.trim();
  if (!externalTruckId) return { ok: false, reason: "Missing external_truck_id." };

  const truckId = await resolveTruckId(supabase, tenantId, connectionId, externalTruckId);
  if (!truckId) {
    return { ok: false, reason: `Unmapped external_truck_id: ${externalTruckId}` };
  }

  const lat = Number(event.latitude);
  const lng = Number(event.longitude);
  if (!validCoords(lat, lng)) {
    return { ok: false, reason: "Invalid latitude or longitude." };
  }

  const recordedAt = event.recorded_at?.trim();
  if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) {
    return { ok: false, reason: "Invalid recorded_at." };
  }

  const externalEventId = event.external_event_id?.trim() || null;

  if (externalEventId) {
    const { data: existing } = await supabase
      .from("telematics_events")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("external_event_id", externalEventId)
      .maybeSingle();
    if (existing?.id) return { ok: true };
  }

  const { error } = await supabase.from("telematics_events").insert({
    tenant_id: tenantId,
    truck_id: truckId,
    connection_id: connectionId,
    recorded_at: recordedAt,
    latitude: lat,
    longitude: lng,
    speed_mph: event.speed_mph != null ? Number(event.speed_mph) : null,
    odometer_miles: event.odometer_miles != null ? Number(event.odometer_miles) : null,
    engine_on: event.engine_on ?? null,
    idle: event.idle ?? null,
    heading_deg: event.heading_deg != null ? Number(event.heading_deg) : null,
    source,
    external_event_id: externalEventId,
    raw_payload: input.rawPayload ?? (event as unknown as Record<string, unknown>),
  });

  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

export async function insertTelematicsBatch(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    source: TelematicsEventSource;
    events: TelematicsWebhookEvent[];
    maxBatch?: number;
  }
): Promise<TelematicsInsertResult> {
  const max = input.maxBatch ?? 100;
  const slice = input.events.slice(0, max);
  const errors: TelematicsInsertError[] = [];
  let processed = 0;

  for (const event of slice) {
    const result = await insertTelematicsEvent(supabase, {
      tenantId: input.tenantId,
      connectionId: input.connectionId,
      source: input.source,
      event,
    });
    if (result.ok) {
      processed += 1;
    } else {
      errors.push({
        external_truck_id: event.external_truck_id ?? "unknown",
        reason: result.reason,
      });
    }
  }

  return { processed, failed: errors.length, errors };
}

export function normalizeTelematicsWebhookBody(body: Record<string, unknown>): TelematicsWebhookEvent[] {
  if (Array.isArray(body.events)) {
    return body.events as TelematicsWebhookEvent[];
  }
  if (body.external_truck_id) {
    return [body as unknown as TelematicsWebhookEvent];
  }
  return [];
}
