import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { WorkOrderDetailView, type PartUsageForDetail } from "../components/work-order-detail-view";

export const metadata = {
  title: "Work Order | Cornerstone Tech",
  description: "Work order details",
};

export default async function WorkOrderDetailPage({
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

  const { data: woRaw, error } = await supabase
    .from("work_orders")
    .select(
      `
      id, work_order_number, title, description, category, priority, status,
      company_id, customer_id, property_id, building_id, unit_id, asset_id,
      source_type, preventive_maintenance_plan_id, preventive_maintenance_run_id,
      requested_at, scheduled_date, scheduled_start, scheduled_end, due_date, completed_at,
      completion_date, resolution_summary, completion_notes, root_cause,
      follow_up_required, customer_visible_summary, internal_completion_notes,
      completed_by_technician_id, completion_status,
      requested_by_name, requested_by_email, requested_by_phone,
      assigned_technician_id, assigned_crew_id,
      estimated_hours, estimated_technicians, actual_hours,
      billable, nte_amount, created_at, updated_at,
      companies(name),
      customers(name),
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets(asset_name, name),
      technicians!assigned_technician_id(technician_name, name),
      crews(name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !woRaw) notFound();

  const companyId = (woRaw as { company_id?: string }).company_id;
  const { data: companyRow } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("tenant_id", membership.tenant_id)
    .maybeSingle();
  if (!companyRow) notFound();

  const row = woRaw as Record<string, unknown>;
  const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
  const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const bld = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const un = Array.isArray(row.units) ? row.units[0] : row.units;
  const ast = Array.isArray(row.assets) ? row.assets[0] : row.assets;
  const tech = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;
  const crew = Array.isArray(row.crews) ? row.crews[0] : row.crews;

  const completedByTechnicianId = (row.completed_by_technician_id as string) ?? null;
  let completedByTechnicianName: string | null = null;
  if (completedByTechnicianId) {
    const { data: cbTech } = await supabase
      .from("technicians")
      .select("technician_name, name")
      .eq("id", completedByTechnicianId)
      .maybeSingle();
    if (cbTech)
      completedByTechnicianName =
        (cbTech as { technician_name?: string }).technician_name ?? (cbTech as { name?: string }).name ?? null;
  }

  let crewLeadName: string | null = null;
  let crewMemberNames: string[] = [];
  const assignedCrewId = row.assigned_crew_id as string | null;
  if (assignedCrewId) {
    const { data: crewRow } = await supabase
      .from("crews")
      .select("id, technicians!crew_lead_id(technician_name, name)")
      .eq("id", assignedCrewId)
      .maybeSingle();
    if (crewRow) {
      const lead = Array.isArray((crewRow as Record<string, unknown>).technicians)
        ? (crewRow as Record<string, unknown>).technicians[0]
        : (crewRow as Record<string, unknown>).technicians;
      if (lead && typeof lead === "object")
        crewLeadName = (lead as { technician_name?: string }).technician_name ?? (lead as { name?: string }).name ?? null;
    }
    const { data: mems } = await supabase
      .from("crew_members")
      .select("technician_id")
      .eq("crew_id", assignedCrewId)
      .order("sort_order");
    if (mems?.length) {
      const techIds = mems.map((m) => (m as { technician_id: string }).technician_id);
      const { data: techs } = await supabase
        .from("technicians")
        .select("id, technician_name, name")
        .in("id", techIds);
      const techById = new Map(
        (techs ?? []).map((t) => [
          (t as { id: string }).id,
          (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? "",
        ])
      );
      crewMemberNames = techIds.map((id) => techById.get(id) ?? "—");
    }
  }

  const workOrder = {
    ...row,
    company_name: comp && typeof comp === "object" && "name" in comp ? (comp as { name?: string }).name : null,
    customer_name: cust && typeof cust === "object" && "name" in cust ? (cust as { name?: string }).name : null,
    property_name: prop && typeof prop === "object" ? (prop as { property_name?: string }).property_name ?? (prop as { name?: string }).name : null,
    building_name: bld && typeof bld === "object" ? (bld as { building_name?: string }).building_name ?? (bld as { name?: string }).name : null,
    unit_name: un && typeof un === "object" ? (un as { unit_name?: string }).unit_name ?? (un as { name_or_number?: string }).name_or_number : null,
    asset_name: ast && typeof ast === "object" ? (ast as { asset_name?: string }).asset_name ?? (ast as { name?: string }).name : null,
    technician_name: tech && typeof tech === "object" ? (tech as { technician_name?: string }).technician_name ?? (tech as { name?: string }).name : null,
    crew_name: crew && typeof crew === "object" && "name" in crew ? (crew as { name?: string }).name : null,
    crew_lead_name: crewLeadName,
    crew_member_names: crewMemberNames,
    completed_by_technician_name: completedByTechnicianName,
  };

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
    .select("id, quantity_used, unit_cost, total_cost, created_at, part_name_snapshot, sku_snapshot, unit_of_measure, used_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });

  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, name, sku, unit, cost, quantity")
    .eq("company_id", companyId)
    .order("name");

  const { data: statusHistory } = await supabase
    .from("work_order_status_history")
    .select("id, from_status, to_status, changed_at")
    .eq("work_order_id", id)
    .order("changed_at", { ascending: false });

  const { data: attachments } = await supabase
    .from("work_order_attachments")
    .select("id, file_name, file_url, file_type, created_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });

  const { data: techniciansData } = await supabase
    .from("technicians")
    .select("id, technician_name, name")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("technician_name")
    .order("name");

  const { data: crewsData } = await supabase
    .from("crews")
    .select("id, name, company_id")
    .eq("tenant_id", membership.tenant_id)
    .eq("is_active", true)
    .order("name");

  const technicianOptions = (techniciansData ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? (t as { id: string }).id,
  }));
  const crewOptions = (crewsData ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
    company_id: (c as { company_id?: string }).company_id ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/work-orders" className="hover:text-[var(--foreground)]">
          Work Orders
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {(workOrder as { work_order_number?: string }).work_order_number ?? id.slice(0, 8)}
        </span>
      </div>
      <WorkOrderDetailView
        workOrder={workOrder as Record<string, unknown>}
        notes={(notes ?? []) as { id: string; body: string; note_type: string | null; created_at: string }[]}
        checklistItems={(checklistItems ?? []) as { id: string; label: string; completed: boolean; sort_order: number }[]}
        partUsage={(partUsage ?? []) as PartUsageForDetail[]}
        statusHistory={(statusHistory ?? []) as { id: string; from_status: string | null; to_status: string; changed_at: string }[]}
        attachments={(attachments ?? []) as { id: string; file_name: string; file_url: string; file_type: string | null; created_at: string }[]}
        technicians={technicianOptions}
        crews={crewOptions}
        inventoryItems={(inventoryItems ?? []) as { id: string; name: string; sku: string | null; unit: string | null; cost: number | null; quantity: number }[]}
      />
    </div>
  );
}
