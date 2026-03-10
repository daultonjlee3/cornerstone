import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { TechnicianJobExecutionView } from "../../components/technician-job-execution-view";

export const metadata = {
  title: "Technician Job Execution | Cornerstone Tech",
  description: "Execute assigned and crew work orders in the technician portal",
};

export default async function TechnicianJobExecutionPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = await params;
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

  const { data: workOrderRaw, error } = await supabase
    .from("work_orders")
    .select(
      `
      id, company_id, work_order_number, title, status, priority, category, source_type,
      description, assigned_technician_id, assigned_crew_id,
      estimated_hours, started_at, last_paused_at, scheduled_start, scheduled_end,
      preventive_maintenance_plan_id,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(id, asset_name, name, manufacturer, model, serial_number, status, condition),
      technicians!assigned_technician_id(technician_name, name),
      crews!assigned_crew_id(name)
    `
    )
    .eq("id", workOrderId)
    .maybeSingle();
  if (error || !workOrderRaw) notFound();

  const companyId = (workOrderRaw as { company_id: string }).company_id;
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("tenant_id", membership.tenant_id)
    .maybeSingle();
  if (!company) notFound();

  const { data: techniciansRaw } = await supabase
    .from("technicians")
    .select("id, technician_name, name, email")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("technician_name");
  const technicians = (techniciansRaw ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name:
      (row as { technician_name?: string | null }).technician_name ??
      (row as { name?: string | null }).name ??
      "Technician",
    email: ((row as { email?: string | null }).email ?? "").toLowerCase(),
  }));
  const currentTechnician =
    technicians.find((technician) => technician.email === (user.email ?? "").toLowerCase()) ?? null;

  const { data: currentCrewRows } = currentTechnician
    ? await supabase
        .from("crew_members")
        .select("crew_id")
        .eq("technician_id", currentTechnician.id)
    : { data: [] as unknown[] };
  const currentCrewIds = (currentCrewRows ?? []).map((row) => (row as { crew_id: string }).crew_id);

  const row = workOrderRaw as Record<string, unknown>;
  const assignedTechnicianId = (row.assigned_technician_id as string | null) ?? null;
  const assignedCrewId = (row.assigned_crew_id as string | null) ?? null;
  if (
    currentTechnician &&
    assignedTechnicianId !== currentTechnician.id &&
    !(assignedCrewId && currentCrewIds.includes(assignedCrewId))
  ) {
    notFound();
  }

  const pmPlanId = (row.preventive_maintenance_plan_id as string | null) ?? null;
  const { data: planRow } = pmPlanId
    ? await supabase
        .from("preventive_maintenance_plans")
        .select("instructions")
        .eq("id", pmPlanId)
        .maybeSingle()
    : { data: null };

  const { data: notesRaw } = await supabase
    .from("work_order_notes")
    .select("id, body, note_type, created_at, technician_id")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  const { data: checklistItems } = await supabase
    .from("work_order_checklist_items")
    .select("id, label, completed, sort_order")
    .eq("work_order_id", workOrderId)
    .order("sort_order");
  const { data: partUsage } = await supabase
    .from("work_order_part_usage")
    .select(
      "id, quantity_used, unit_cost, total_cost, created_at, part_name_snapshot, sku_snapshot, unit_of_measure, used_at"
    )
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, name, sku, unit, cost, quantity")
    .eq("company_id", companyId)
    .order("name");
  const { data: attachmentsRaw } = await supabase
    .from("work_order_attachments")
    .select("id, file_name, file_url, file_type, caption, technician_id, created_at")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  const { data: laborEntriesRaw } = await supabase
    .from("work_order_labor_entries")
    .select("id, technician_id, started_at, ended_at, duration_minutes, is_active, created_at")
    .eq("work_order_id", workOrderId)
    .order("started_at", { ascending: false });
  const { data: activityRaw } = await supabase
    .from("activity_logs")
    .select("id, action_type, performed_at, metadata")
    .eq("entity_type", "work_order")
    .eq("entity_id", workOrderId)
    .in("action_type", [
      "job_started",
      "job_paused",
      "job_completed",
      "work_order_photo_uploaded",
      "work_order_note_added",
      "labor_logged",
    ])
    .order("performed_at", { ascending: false })
    .limit(80);

  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const unit = Array.isArray(row.units) ? row.units[0] : row.units;
  const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
  const technician = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;
  const crew = Array.isArray(row.crews) ? row.crews[0] : row.crews;

  const location =
    [
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
      .join(" / ") || null;

  const executionWorkOrder = {
    id: row.id as string,
    work_order_number: (row.work_order_number as string | null) ?? null,
    title: (row.title as string) ?? "Work order",
    status: (row.status as string) ?? "new",
    priority: (row.priority as string) ?? "medium",
    category: (row.category as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    instructions:
      ((planRow as { instructions?: string | null } | null)?.instructions as string | null | undefined) ??
      null,
    source_type: (row.source_type as string | null) ?? null,
    asset_name:
      asset && typeof asset === "object"
        ? ((asset as { asset_name?: string | null }).asset_name ??
          (asset as { name?: string | null }).name ??
          null)
        : null,
    location,
    assigned_technician_id: assignedTechnicianId,
    assigned_technician_name:
      technician && typeof technician === "object"
        ? ((technician as { technician_name?: string | null }).technician_name ??
          (technician as { name?: string | null }).name ??
          null)
        : null,
    assigned_crew_name:
      crew && typeof crew === "object" ? ((crew as { name?: string | null }).name ?? null) : null,
    estimated_hours: (row.estimated_hours as number | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    last_paused_at: (row.last_paused_at as string | null) ?? null,
    scheduled_start: (row.scheduled_start as string | null) ?? null,
    scheduled_end: (row.scheduled_end as string | null) ?? null,
    technician_id_for_actor: currentTechnician?.id ?? null,
    notesTimeline: (notesRaw ?? []).map((note) => ({
      id: (note as { id: string }).id,
      body: (note as { body: string }).body,
      note_type: (note as { note_type?: string | null }).note_type ?? null,
      created_at: (note as { created_at: string }).created_at,
      technician_id: (note as { technician_id?: string | null }).technician_id ?? null,
    })),
    activityTimeline: (activityRaw ?? []).map((entry) => ({
      id: (entry as { id: string }).id,
      action_type: (entry as { action_type: string }).action_type,
      performed_at: (entry as { performed_at: string }).performed_at,
      metadata: ((entry as { metadata?: Record<string, unknown> | null }).metadata ?? null) as
        | Record<string, unknown>
        | null,
    })),
    asset_summary: {
      manufacturer:
        asset && typeof asset === "object"
          ? ((asset as { manufacturer?: string | null }).manufacturer ?? null)
          : null,
      model:
        asset && typeof asset === "object"
          ? ((asset as { model?: string | null }).model ?? null)
          : null,
      serial_number:
        asset && typeof asset === "object"
          ? ((asset as { serial_number?: string | null }).serial_number ?? null)
          : null,
      status:
        asset && typeof asset === "object"
          ? ((asset as { status?: string | null }).status ?? null)
          : null,
      condition:
        asset && typeof asset === "object"
          ? ((asset as { condition?: string | null }).condition ?? null)
          : null,
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/technician/jobs" className="hover:text-[var(--foreground)]">
          My Jobs
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {executionWorkOrder.work_order_number ?? executionWorkOrder.id.slice(0, 8)}
        </span>
      </div>

      <TechnicianJobExecutionView
        workOrder={executionWorkOrder}
        checklistItems={
          (checklistItems ?? []) as {
            id: string;
            label: string;
            completed: boolean;
            sort_order: number;
          }[]
        }
        partUsage={
          (partUsage ?? []) as {
            id: string;
            quantity_used: number;
            unit_cost: number | null;
            total_cost: number | null;
            created_at: string;
            part_name_snapshot: string | null;
            sku_snapshot: string | null;
            unit_of_measure: string | null;
            used_at: string | null;
          }[]
        }
        inventoryItems={
          (inventoryItems ?? []) as {
            id: string;
            name: string;
            sku: string | null;
            unit: string | null;
            cost: number | null;
            quantity: number;
          }[]
        }
        technicians={technicians.map((technician) => ({ id: technician.id, name: technician.name }))}
        laborEntries={
          (laborEntriesRaw ?? []) as {
            id: string;
            technician_id: string | null;
            started_at: string;
            ended_at: string | null;
            duration_minutes: number | null;
            is_active: boolean;
            created_at: string;
          }[]
        }
        attachments={
          (attachmentsRaw ?? []) as {
            id: string;
            file_name: string;
            file_url: string;
            file_type: string | null;
            caption: string | null;
            technician_id: string | null;
            created_at: string;
          }[]
        }
      />
    </div>
  );
}
