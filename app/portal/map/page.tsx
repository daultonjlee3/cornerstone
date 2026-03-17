import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";
import { PortalMapView } from "./portal-map-view";

export const metadata = {
  title: "Portal Map | Cornerstone Tech",
  description: "Technician map with today assignments, routing, and directions",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export default async function PortalMapPage() {
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context) redirect("/login");
  if (!context.actingAsTechnician || !context.technicianId || !context.technicianCompanyId) {
    redirect("/portal/work-orders");
  }

  const { data: technicianRow } = await supabase
    .from("technicians")
    .select("current_latitude, current_longitude")
    .eq("id", context.technicianId)
    .limit(1)
    .maybeSingle();
  const initialLatitude =
    (technicianRow as { current_latitude?: number | null } | null)?.current_latitude ?? null;
  const initialLongitude =
    (technicianRow as { current_longitude?: number | null } | null)?.current_longitude ?? null;

  const today = todayIso();
  const { data: rows } = await supabase
    .from("work_orders")
    .select(
      `
      id, title, work_order_number, priority, status, scheduled_start, scheduled_date,
      assigned_technician_id, assigned_crew_id,
      latitude, longitude,
      properties(property_name, name, address_line1, city, state, zip),
      buildings(building_name, name, address),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(asset_name, name)
    `
    )
    .eq("company_id", context.technicianCompanyId)
    .eq("scheduled_date", today)
    .not("status", "in", "(completed,cancelled)")
    .order("scheduled_start", { ascending: true });

  const jobs = (rows ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const assignedTechnicianId = (record.assigned_technician_id as string | null) ?? null;
      const assignedCrewId = (record.assigned_crew_id as string | null) ?? null;
      if (
        assignedTechnicianId !== context.technicianId &&
        !(assignedCrewId && context.crewIds.includes(assignedCrewId))
      ) {
        return null;
      }

      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const property = Array.isArray(record.properties) ? record.properties[0] : record.properties;
      const building = Array.isArray(record.buildings) ? record.buildings[0] : record.buildings;
      const unit = Array.isArray(record.units) ? record.units[0] : record.units;
      const asset = Array.isArray(record.assets) ? record.assets[0] : record.assets;

      const propertyName =
        property && typeof property === "object"
          ? firstString(
              (property as { property_name?: string | null }).property_name,
              (property as { name?: string | null }).name
            )
          : null;
      const buildingName =
        building && typeof building === "object"
          ? firstString(
              (building as { building_name?: string | null }).building_name,
              (building as { name?: string | null }).name
            )
          : null;
      const unitName =
        unit && typeof unit === "object"
          ? firstString(
              (unit as { unit_name?: string | null }).unit_name,
              (unit as { name_or_number?: string | null }).name_or_number
            )
          : null;
      const assetName =
        asset && typeof asset === "object"
          ? firstString(
              (asset as { asset_name?: string | null }).asset_name,
              (asset as { name?: string | null }).name
            )
          : null;
      const propertyAddress =
        property && typeof property === "object"
          ? firstString(
              (property as { address_line1?: string | null }).address_line1,
              [
                (property as { city?: string | null }).city,
                (property as { state?: string | null }).state,
                (property as { zip?: string | null }).zip,
              ]
                .filter(Boolean)
                .join(" ")
            )
          : null;
      const buildingAddress =
        building && typeof building === "object"
          ? firstString((building as { address?: string | null }).address)
          : null;

      return {
        id: record.id as string,
        title:
          firstString(
            (record.title as string | null | undefined) ?? null,
            (record.work_order_number as string | null | undefined) ?? null
          ) ?? "Work order",
        priority: ((record.priority as string | null) ?? "medium").toLowerCase(),
        status: ((record.status as string | null) ?? "new").toLowerCase(),
        scheduled_time:
          (record.scheduled_start as string | null) ??
          ((record.scheduled_date as string | null) ? `${record.scheduled_date}T12:00:00` : null),
        address:
          [propertyName, buildingName, unitName, assetName, buildingAddress, propertyAddress]
            .filter(Boolean)
            .join(" • ") || "Address unavailable",
        latitude,
        longitude,
      };
    })
    .filter((job): job is NonNullable<typeof job> => Boolean(job));

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Today&apos;s Map</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Live location, assigned jobs, and in-app turn-by-turn routing.
        </p>
      </section>
      <PortalMapView
        jobs={jobs}
        initialLatitude={initialLatitude}
        initialLongitude={initialLongitude}
      />
    </div>
  );
}
