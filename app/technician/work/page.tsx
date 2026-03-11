import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { TechnicianJobCard } from "../components/technician-job-card";
import type { TechnicianPortalJob } from "../components/job-types";

export const metadata = {
  title: "Technician Workspace | Cornerstone Tech",
  description: "Technician work execution workspace",
};

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function weekEndIso(todayIso: string): string {
  const today = new Date(`${todayIso}T00:00:00`);
  const day = today.getDay();
  const delta = day === 0 ? 6 : 7 - day;
  const end = new Date(today);
  end.setDate(today.getDate() + delta);
  return end.toISOString().slice(0, 10);
}

function renderSection(title: string, jobs: TechnicianPortalJob[]) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {title}
        </h2>
        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--muted-strong)]">
          {jobs.length}
        </span>
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] px-3 py-4 text-sm text-[var(--muted)]">
          No work orders in this section.
        </p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <TechnicianJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function TechnicianWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id);
  const companyIds = (companies ?? []).map((company) => company.id);

  const { data: techniciansRaw } = companyIds.length
    ? await supabase
        .from("technicians")
        .select("id, company_id, technician_name, name, email, status")
        .in("company_id", companyIds)
        .eq("status", "active")
    : { data: [] as unknown[] };

  const technicians = (techniciansRaw ?? []).map((row) => ({
    id: (row as { id: string }).id,
    company_id: (row as { company_id?: string | null }).company_id ?? null,
    name:
      (row as { technician_name?: string | null }).technician_name ??
      (row as { name?: string | null }).name ??
      "Technician",
    email: ((row as { email?: string | null }).email ?? "").toLowerCase(),
  }));
  const currentTechnician =
    technicians.find((technician) => technician.email === (user.email ?? "").toLowerCase()) ?? null;

  if (!currentTechnician) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Technician profile not linked
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your user account is not linked to an active technician record yet. Contact operations to link your profile.
        </p>
      </div>
    );
  }

  const { data: crewMemberships } = await supabase
    .from("crew_members")
    .select("crew_id")
    .eq("technician_id", currentTechnician.id);
  const crewIds = (crewMemberships ?? []).map((row) => (row as { crew_id: string }).crew_id);

  const { data: crewsRaw } = crewIds.length
    ? await supabase.from("crews").select("id, name").in("id", crewIds)
    : { data: [] as unknown[] };
  const crewNameById = new Map(
    (crewsRaw ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { name?: string | null }).name ?? "Crew",
    ])
  );

  const { data: workOrdersRaw } = companyIds.length
    ? await supabase
        .from("work_orders")
        .select(
          `
          id, work_order_number, title, status, priority, category, source_type,
          assigned_technician_id, assigned_crew_id, due_date, completed_at,
          scheduled_date, scheduled_start, scheduled_end,
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
        .order("due_date", { ascending: true })
    : { data: [] as unknown[] };

  const jobs = (workOrdersRaw ?? [])
    .map((row) => {
      const workOrder = row as Record<string, unknown>;
      const property = Array.isArray(workOrder.properties) ? workOrder.properties[0] : workOrder.properties;
      const building = Array.isArray(workOrder.buildings) ? workOrder.buildings[0] : workOrder.buildings;
      const unit = Array.isArray(workOrder.units) ? workOrder.units[0] : workOrder.units;
      const asset = Array.isArray(workOrder.assets) ? workOrder.assets[0] : workOrder.assets;
      const assignedTech = Array.isArray(workOrder.technicians)
        ? workOrder.technicians[0]
        : workOrder.technicians;

      const assignedTechnicianId = (workOrder.assigned_technician_id as string | null) ?? null;
      const assignedCrewId = (workOrder.assigned_crew_id as string | null) ?? null;
      const isDirect = assignedTechnicianId === currentTechnician.id;
      const isCrew = Boolean(assignedCrewId && crewIds.includes(assignedCrewId));
      if (!isDirect && !isCrew) return null;

      return {
        id: workOrder.id as string,
        workOrderNumber: (workOrder.work_order_number as string | null) ?? null,
        title: (workOrder.title as string | null) ?? "Work order",
        status: (workOrder.status as string | null) ?? "new",
        priority: (workOrder.priority as string | null) ?? "medium",
        dueDate: (workOrder.due_date as string | null) ?? null,
        completedAt: (workOrder.completed_at as string | null) ?? null,
        scheduledDate: (workOrder.scheduled_date as string | null) ?? null,
        scheduledStart: (workOrder.scheduled_start as string | null) ?? null,
        scheduledEnd: (workOrder.scheduled_end as string | null) ?? null,
        assetName:
          asset && typeof asset === "object"
            ? ((asset as { asset_name?: string | null }).asset_name ??
              (asset as { name?: string | null }).name ??
              null)
            : null,
        location: [
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
          .join(" / ") || null,
        assignmentScope: isDirect ? "direct" : "crew",
        assignedCrewName: assignedCrewId ? crewNameById.get(assignedCrewId) ?? null : null,
        assignedTechnicianName:
          assignedTech && typeof assignedTech === "object"
            ? ((assignedTech as { technician_name?: string | null }).technician_name ??
              (assignedTech as { name?: string | null }).name ??
              null)
            : null,
        isPm:
          (workOrder.source_type as string | null) === "preventive_maintenance" ||
          (workOrder.category as string | null) === "preventive_maintenance",
      } satisfies TechnicianPortalJob;
    })
    .filter((job): job is TechnicianPortalJob => Boolean(job));

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = weekEndIso(today);

  const completed = jobs.filter((job) => job.status === "completed");
  const active = jobs.filter((job) => job.status !== "completed");

  const overdue = active.filter((job) => {
    const anchor = isoDate(job.dueDate) ?? isoDate(job.scheduledDate);
    return Boolean(anchor && anchor < today);
  });
  const todayJobs = active.filter((job) => {
    const anchor = isoDate(job.dueDate) ?? isoDate(job.scheduledDate);
    if (job.status === "in_progress") return true;
    return anchor === today;
  });
  const thisWeek = active.filter((job) => {
    const anchor = isoDate(job.dueDate) ?? isoDate(job.scheduledDate);
    if (!anchor) return false;
    if (anchor < today || anchor === today) return false;
    return anchor <= weekEnd;
  });

  const openCount = active.length;
  const inProgressCount = active.filter((job) => job.status === "in_progress").length;
  const completedTodayCount = completed.filter((job) => isoDate(job.completedAt) === today).length;
  const overdueCount = overdue.length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Technician Workspace</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Assigned to {currentTechnician.name}. Tap any card to execute work.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted)]">Open Work Orders</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{openCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted)]">In Progress</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted)]">Completed Today</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{completedTodayCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs text-[var(--muted)]">Overdue</p>
          <p className="text-lg font-semibold text-red-700">{overdueCount}</p>
        </div>
      </section>

      {renderSection("Today", todayJobs)}
      {renderSection("This Week", thisWeek)}
      {renderSection("Overdue", overdue)}
      {renderSection("Completed", completed)}
    </div>
  );
}
