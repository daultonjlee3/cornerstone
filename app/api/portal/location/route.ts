import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";

type LocationPayload = {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  event?: "enabled" | "disabled";
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context || !context.actingAsTechnician || !context.technicianId || !context.technicianCompanyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as LocationPayload;
  if (payload.event === "enabled" || payload.event === "disabled") {
    await insertActivityLog(supabase as unknown as SupabaseClient, {
      tenantId: context.tenantId,
      companyId: context.technicianCompanyId,
      entityType: "technician",
      entityId: context.technicianId,
      actionType:
        payload.event === "enabled"
          ? "location_tracking_enabled"
          : "location_tracking_disabled",
      performedBy: context.userId,
      metadata: {
        impersonating: Boolean(context.impersonation),
        technician_id: context.technicianId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const accuracy =
    payload.accuracy == null || !Number.isFinite(Number(payload.accuracy))
      ? null
      : Number(payload.accuracy);
  if (!validCoordinate(latitude, longitude)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const { data: lastLocation } = await supabase
    .from("technician_locations")
    .select("latitude, longitude, updated_at")
    .eq("technician_id", context.technicianId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  let shouldPersist = true;
  if (lastLocation) {
    const lastRecord = lastLocation as {
      latitude?: number | null;
      longitude?: number | null;
      updated_at?: string | null;
    };
    if (
      lastRecord.latitude != null &&
      lastRecord.longitude != null &&
      lastRecord.updated_at
    ) {
      const lastMs = new Date(lastRecord.updated_at).getTime();
      const elapsedSeconds = Number.isFinite(lastMs)
        ? Math.max(0, (Date.now() - lastMs) / 1000)
        : 999;
      const movedKm = haversineKm(
        latitude,
        longitude,
        Number(lastRecord.latitude),
        Number(lastRecord.longitude)
      );
      if (elapsedSeconds < 20 && movedKm < 0.03) {
        shouldPersist = false;
      }
    }
  }

  if (shouldPersist) {
    const { error } = await supabase.from("technician_locations").insert({
      company_id: context.technicianCompanyId,
      technician_id: context.technicianId,
      user_id: context.userId,
      latitude,
      longitude,
      accuracy,
      updated_at: nowIso,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    await supabase
      .from("technicians")
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_at: nowIso,
      })
      .eq("id", context.technicianId);
  }

  return NextResponse.json({
    ok: true,
    stored: shouldPersist,
    updated_at: nowIso,
  });
}
