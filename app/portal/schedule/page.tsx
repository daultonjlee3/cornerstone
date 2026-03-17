import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";

export const metadata = {
  title: "Portal Schedule | Cornerstone Tech",
  description: "Technician daily schedule",
};

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function PortalSchedulePage() {
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context) redirect("/login");
  if (!context.actingAsTechnician || !context.technicianId || !context.technicianCompanyId) {
    redirect("/portal/work-orders");
  }

  const today = new Date().toISOString().slice(0, 10);
  const technicianId = context.technicianId;
  const crewIds = context.crewIds;

  const { data: workOrdersRaw } = await supabase
    .from("work_orders")
    .select(
      `
      id, work_order_number, title, status, priority, scheduled_date, scheduled_start, scheduled_end,
      assigned_technician_id, assigned_crew_id,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number)
    `
    )
    .eq("company_id", context.technicianCompanyId)
    .eq("scheduled_date", today)
    .not("status", "in", "(completed,cancelled)")
    .order("scheduled_start", { ascending: true });

  const rows = (workOrdersRaw ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const assignedTechnicianId = (record.assigned_technician_id as string | null) ?? null;
      const assignedCrewId = (record.assigned_crew_id as string | null) ?? null;
      if (assignedTechnicianId !== technicianId && !(assignedCrewId && crewIds.includes(assignedCrewId))) {
        return null;
      }

      const property = Array.isArray(record.properties) ? record.properties[0] : record.properties;
      const building = Array.isArray(record.buildings) ? record.buildings[0] : record.buildings;
      const unit = Array.isArray(record.units) ? record.units[0] : record.units;
      const location = [
        property && typeof property === "object"
          ? ((property as { property_name?: string | null }).property_name ??
            (property as { name?: string | null }).name ??
            null)
          : null,
        building && typeof building === "object"
          ? ((building as { building_name?: string | null }).building_name ??
            (building as { name?: string | null }).name ??
            null)
          : null,
        unit && typeof unit === "object"
          ? ((unit as { unit_name?: string | null }).unit_name ??
            (unit as { name_or_number?: string | null }).name_or_number ??
            null)
          : null,
      ]
        .filter(Boolean)
        .join(" / ");

      return {
        id: record.id as string,
        workOrderNumber: (record.work_order_number as string | null) ?? null,
        title: (record.title as string | null) ?? "Work order",
        priority: (record.priority as string | null) ?? "medium",
        status: (record.status as string | null) ?? "new",
        scheduledStart: (record.scheduled_start as string | null) ?? null,
        scheduledEnd: (record.scheduled_end as string | null) ?? null,
        location: location || "Location not set",
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Today&apos;s Schedule</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {today} · {rows.length} assigned job{rows.length === 1 ? "" : "s"}
        </p>
      </section>

      <section className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] px-3 py-4 text-sm text-[var(--muted)]">
            No scheduled jobs for today.
          </p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/portal/work-orders/${row.id}`}
              className="block rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-3 hover:border-[var(--accent)]/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    {row.workOrderNumber ?? "Work order"}
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{row.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{row.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {formatTime(row.scheduledStart)} - {formatTime(row.scheduledEnd)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {row.priority} · {row.status}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
