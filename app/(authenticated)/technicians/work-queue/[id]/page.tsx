import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { TechnicianExecutionView } from "../components/technician-execution-view";

export const metadata = {
  title: "Technician Work Execution | Cornerstone Tech",
  description: "Execute assigned work orders",
};

export default async function TechnicianExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      estimated_hours, started_at, last_paused_at,
      preventive_maintenance_plan_id,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(id, asset_name, name, manufacturer, model, serial_number, status, condition),
      technicians!assigned_technician_id(technician_name, name),
      crews!assigned_crew_id(name)
    `
    )
    .eq("id", id)
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
      (row as { technician_name?: string }).technician_name ??
      (row as { name?: string }).name ??
      "Technician",
    email: (row as { email?: string | null }).email ?? null,
  }));
  const currentTechnician =
    technicians.find(
      (technician) =>
        (technician.email ?? "").toLowerCase() === (user.email ?? "").toLowerCase()
    ) ?? null;

  const { data: currentCrewRows } = currentTechnician
    ? await supabase
        .from("crew_members")
        .select("crew_id")
        .eq("technician_id", currentTechnician.id)
    : { data: [] as unknown[] };
  const currentCrewIds = (currentCrewRows ?? []).map(
    (row) => (row as { crew_id: string }).crew_id
  );

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

  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("id, body, note_type, created_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });
  const { data: checklistItems } = await supabase
    .from("work_order_checklist_items")
    .select("id, label, completed, sort_order")
    .eq("work_order_id", id)
    .order("sort_order");
  const { data: partUsage } = await supabase
    .from("work_order_part_usage")
    .select(
      "id, quantity_used, unit_cost, total_cost, created_at, part_name_snapshot, sku_snapshot, unit_of_measure, used_at"
    )
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, name, sku, unit, cost, quantity")
    .eq("company_id", companyId)
    .order("name");

  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const unit = Array.isArray(row.units) ? row.units[0] : row.units;
  const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
  const technician = Array.isArray(row.technicians)
    ? row.technicians[0]
    : row.technicians;
  const crew = Array.isArray(row.crews) ? row.crews[0] : row.crews;

  const location =
    [
      property && typeof property === "object"
        ? ((property as { property_name?: string }).property_name ??
          (property as { name?: string }).name ??
          null)
        : null,
      building && typeof building === "object"
        ? ((building as { building_name?: string }).building_name ??
          (building as { name?: string }).name ??
          null)
        : null,
      unit && typeof unit === "object"
        ? ((unit as { unit_name?: string }).unit_name ??
          (unit as { name_or_number?: string }).name_or_number ??
          null)
        : null,
    ]
      .filter(Boolean)
      .join(" / ") || null;

  const assetName =
    asset && typeof asset === "object"
      ? ((asset as { asset_name?: string }).asset_name ??
        (asset as { name?: string }).name ??
        null)
      : null;

  const executionWorkOrder = {
    id: row.id as string,
    work_order_number: (row.work_order_number as string | null) ?? null,
    title: (row.title as string) ?? "Work order",
    status: (row.status as string) ?? "new",
    priority: (row.priority as string) ?? "medium",
    category: (row.category as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    instructions:
      ((planRow as { instructions?: string | null } | null)?.instructions as
        | string
        | null
        | undefined) ?? null,
    source_type: (row.source_type as string | null) ?? null,
    asset_name: assetName,
    location,
    assigned_technician_id: assignedTechnicianId,
    assigned_technician_name:
      technician && typeof technician === "object"
        ? ((technician as { technician_name?: string }).technician_name ??
          (technician as { name?: string }).name ??
          null)
        : null,
    assigned_crew_name:
      crew && typeof crew === "object"
        ? ((crew as { name?: string }).name ?? null)
        : null,
    estimated_hours: (row.estimated_hours as number | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    last_paused_at: (row.last_paused_at as string | null) ?? null,
    asset_summary: {
      manufacturer:
        asset && typeof asset === "object"
          ? ((asset as { manufacturer?: string }).manufacturer ?? null)
          : null,
      model:
        asset && typeof asset === "object"
          ? ((asset as { model?: string }).model ?? null)
          : null,
      serial_number:
        asset && typeof asset === "object"
          ? ((asset as { serial_number?: string }).serial_number ?? null)
          : null,
      status:
        asset && typeof asset === "object"
          ? ((asset as { status?: string }).status ?? null)
          : null,
      condition:
        asset && typeof asset === "object"
          ? ((asset as { condition?: string }).condition ?? null)
          : null,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/technicians/work-queue" className="hover:text-[var(--foreground)]">
          Technician Work Queue
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {executionWorkOrder.work_order_number ?? executionWorkOrder.id.slice(0, 8)}
        </span>
      </div>

      <TechnicianExecutionView
        workOrder={executionWorkOrder}
        checklistItems={
          (checklistItems ?? []) as {
            id: string;
            label: string;
            completed: boolean;
            sort_order: number;
          }[]
        }
        notes={
          (notes ?? []) as {
            id: string;
            body: string;
            note_type: string | null;
            created_at: string;
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
        technicians={technicians.map((technician) => ({
          id: technician.id,
          name: technician.name,
        }))}
      />
    </div>
  );
}
