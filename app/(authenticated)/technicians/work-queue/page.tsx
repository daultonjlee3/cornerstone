import Link from "next/link";
import { ListChecks } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PageHeader } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { formatDate, formatDateTime } from "@/src/lib/date-utils";

export const metadata = {
  title: "Technician Work Queue | Cornerstone Tech",
  description: "Technician work execution queue",
};

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

function checkedParam(
  value: string | string[] | undefined,
  defaultValue: boolean
): boolean {
  if (typeof value === "string") return value === "1";
  if (Array.isArray(value)) return value.includes("1");
  return defaultValue;
}


export default async function TechnicianWorkQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");
  const companyIds = (companies ?? []).map((row) => row.id);

  const { data: techniciansRaw } = await supabase
    .from("technicians")
    .select("id, company_id, technician_name, name, email, status")
    .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", "active")
    .order("technician_name");
  const technicians = (techniciansRaw ?? []).map((row) => ({
    id: (row as { id: string }).id,
    company_id: (row as { company_id: string }).company_id,
    name:
      (row as { technician_name?: string }).technician_name ??
      (row as { name?: string }).name ??
      "Technician",
    email: (row as { email?: string | null }).email ?? null,
  }));

  const myTechnician =
    technicians.find(
      (tech) =>
        (tech.email ?? "").toLowerCase() === (user.email ?? "").toLowerCase()
    ) ?? null;

  const selectedTechnicianIdParam = firstParam(searchParams.technician_id);
  const selectedTechnicianId =
    (selectedTechnicianIdParam &&
    technicians.some((technician) => technician.id === selectedTechnicianIdParam)
      ? selectedTechnicianIdParam
      : null) ??
    myTechnician?.id ??
    technicians[0]?.id ??
    null;

  const includeAssignedToMe = checkedParam(searchParams.me, true);
  const includeAssignedToCrew = checkedParam(searchParams.crew, true);
  const inProgressOnly = checkedParam(searchParams.in_progress, false);
  const scheduledTodayOnly = checkedParam(searchParams.scheduled_today, false);

  const { data: crewMembers } = selectedTechnicianId
    ? await supabase
        .from("crew_members")
        .select("crew_id")
        .eq("technician_id", selectedTechnicianId)
    : { data: [] as unknown[] };
  const crewIds = (crewMembers ?? []).map(
    (row) => (row as { crew_id: string }).crew_id
  );

  const { data: crewsRaw } = crewIds.length
    ? await supabase.from("crews").select("id, name").in("id", crewIds)
    : { data: [] as unknown[] };
  const crewNameById = new Map(
    (crewsRaw ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { name: string }).name,
    ])
  );

  const { data: workOrdersRaw, error } = companyIds.length
    ? await supabase
        .from("work_orders")
        .select(
          `
          id, work_order_number, title, status, priority, category, source_type,
          assigned_technician_id, assigned_crew_id,
          scheduled_date, scheduled_start, scheduled_end,
          due_date, asset_id, preventive_maintenance_plan_id,
          properties(property_name, name),
          buildings(building_name, name),
          units(unit_name, name_or_number),
          assets!work_orders_asset_id_fkey(asset_name, name),
          technicians!assigned_technician_id(technician_name, name)
        `
        )
        .in("company_id", companyIds)
        .in("status", [
          "new",
          "ready_to_schedule",
          "scheduled",
          "in_progress",
          "on_hold",
          "completed",
        ])
        .order("scheduled_date", { ascending: true })
        .order("priority", { ascending: false })
    : { data: [] as unknown[], error: null };

  const today = new Date().toISOString().slice(0, 10);

  const rows = (workOrdersRaw ?? []).map((row) => {
    const workOrder = row as Record<string, unknown>;
    const property = Array.isArray(workOrder.properties)
      ? workOrder.properties[0]
      : workOrder.properties;
    const building = Array.isArray(workOrder.buildings)
      ? workOrder.buildings[0]
      : workOrder.buildings;
    const unit = Array.isArray(workOrder.units)
      ? workOrder.units[0]
      : workOrder.units;
    const asset = Array.isArray(workOrder.assets)
      ? workOrder.assets[0]
      : workOrder.assets;
    const technician = Array.isArray(workOrder.technicians)
      ? workOrder.technicians[0]
      : workOrder.technicians;
    const propertyName =
      property && typeof property === "object"
        ? ((property as { property_name?: string }).property_name ??
          (property as { name?: string }).name ??
          null)
        : null;
    const buildingName =
      building && typeof building === "object"
        ? ((building as { building_name?: string }).building_name ??
          (building as { name?: string }).name ??
          null)
        : null;
    const unitName =
      unit && typeof unit === "object"
        ? ((unit as { unit_name?: string }).unit_name ??
          (unit as { name_or_number?: string }).name_or_number ??
          null)
        : null;
    const assetName =
      asset && typeof asset === "object"
        ? ((asset as { asset_name?: string }).asset_name ??
          (asset as { name?: string }).name ??
          null)
        : null;
    const assignedTechName =
      technician && typeof technician === "object"
        ? ((technician as { technician_name?: string }).technician_name ??
          (technician as { name?: string }).name ??
          null)
        : null;
    return {
      id: workOrder.id as string,
      work_order_number: (workOrder.work_order_number as string | null) ?? null,
      title: (workOrder.title as string) ?? "Work order",
      status: (workOrder.status as string) ?? "new",
      priority: (workOrder.priority as string) ?? "medium",
      source_type: (workOrder.source_type as string | null) ?? null,
      category: (workOrder.category as string | null) ?? null,
      assigned_technician_id:
        (workOrder.assigned_technician_id as string | null) ?? null,
      assigned_crew_id: (workOrder.assigned_crew_id as string | null) ?? null,
      scheduled_date: (workOrder.scheduled_date as string | null) ?? null,
      scheduled_start: (workOrder.scheduled_start as string | null) ?? null,
      scheduled_end: (workOrder.scheduled_end as string | null) ?? null,
      due_date: (workOrder.due_date as string | null) ?? null,
      asset_name: assetName,
      location: [propertyName, buildingName, unitName].filter(Boolean).join(" / "),
      assigned_technician_name: assignedTechName,
      assigned_crew_name:
        ((workOrder.assigned_crew_id as string | null) &&
          crewNameById.get((workOrder.assigned_crew_id as string) ?? "")) ??
        null,
      is_pm:
        (workOrder.source_type as string | null) === "preventive_maintenance" ||
        (workOrder.category as string | null) === "preventive_maintenance",
    };
  });

  const filteredRows = rows.filter((row) => {
    const assignedToMe =
      selectedTechnicianId != null &&
      row.assigned_technician_id === selectedTechnicianId;
    const assignedToCrew =
      row.assigned_crew_id != null && crewIds.includes(row.assigned_crew_id);

    const passesOwnership =
      (includeAssignedToMe && assignedToMe) ||
      (includeAssignedToCrew && assignedToCrew) ||
      (!includeAssignedToMe && !includeAssignedToCrew);
    if (!passesOwnership) return false;

    if (inProgressOnly && row.status !== "in_progress") return false;
    if (scheduledTodayOnly && row.scheduled_date !== today) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-tour="demo-guided:technician-execution">
      <PageHeader
        icon={<ListChecks className="size-5" />}
        title="Technician Work Queue"
        subtitle="Execute assigned work orders, track notes, labor, and materials."
        actions={
          <Link href="/technicians">
            <Button variant="secondary">Back to Technicians</Button>
          </Link>
        }
      />

      <form className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="technician_id" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Technician
            </label>
            <select
              id="technician_id"
              name="technician_id"
              defaultValue={selectedTechnicianId ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="hidden" name="me" value="0" />
            <input
              type="checkbox"
              name="me"
              value="1"
              defaultChecked={includeAssignedToMe}
              className="rounded border-[var(--card-border)]"
            />
            Assigned to me
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="hidden" name="crew" value="0" />
            <input
              type="checkbox"
              name="crew"
              value="1"
              defaultChecked={includeAssignedToCrew}
              className="rounded border-[var(--card-border)]"
            />
            Assigned to my crew
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="hidden" name="in_progress" value="0" />
            <input
              type="checkbox"
              name="in_progress"
              value="1"
              defaultChecked={inProgressOnly}
              className="rounded border-[var(--card-border)]"
            />
            In progress only
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="hidden" name="scheduled_today" value="0" />
            <input
              type="checkbox"
              name="scheduled_today"
              value="1"
              defaultChecked={scheduledTodayOnly}
              className="rounded border-[var(--card-border)]"
            />
            Scheduled today
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Apply filters
          </button>
          <Link
            href="/technicians/work-queue"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80"
          >
            Reset
          </Link>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {error.message}
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
          No work orders match the current technician queue filters.
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm sm:min-w-[1000px]">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2.5 font-semibold">Work Order</th>
                  <th className="px-3 py-2.5 font-semibold">Title</th>
                  <th className="px-3 py-2.5 font-semibold">Asset</th>
                  <th className="px-3 py-2.5 font-semibold">Property / Location</th>
                  <th className="px-3 py-2.5 font-semibold">Scheduled Time</th>
                  <th className="px-3 py-2.5 font-semibold">Priority</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Assigned</th>
                  <th className="px-3 py-2.5 font-semibold">Execute</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((workOrder) => (
                  <tr
                    key={workOrder.id}
                    data-demo-scenario-target="technician-task-row"
                    data-work-order-id={workOrder.id}
                    className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <td className="px-3 py-3 text-[var(--foreground)]">
                      {workOrder.work_order_number ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{workOrder.title}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{workOrder.asset_name ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{workOrder.location || "—"}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {workOrder.scheduled_start
                        ? `${formatDateTime(workOrder.scheduled_start)} - ${formatDateTime(
                            workOrder.scheduled_end
                          )}`
                        : formatDate(workOrder.scheduled_date)}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      <PriorityBadge priority={workOrder.priority} />
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {workOrder.is_pm ? "PM" : "Reactive"}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      <StatusBadge status={workOrder.status} />
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {[workOrder.assigned_technician_name, workOrder.assigned_crew_name]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/technicians/work-queue/${workOrder.id}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 sm:min-w-0"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
