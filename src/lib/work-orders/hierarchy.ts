import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type WorkOrderHierarchySummary = {
  id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  assigned_technician_id: string | null;
  assigned_crew_id: string | null;
  due_date: string | null;
  updated_at: string | null;
  technician_name?: string | null;
  crew_name?: string | null;
};

async function getScopedCompanyIds() {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { supabase, companyIds: [] as string[] };
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  return {
    supabase,
    companyIds: (companies ?? []).map((row) => (row as { id: string }).id),
  };
}

export async function getParentWorkOrder(
  workOrderId: string
): Promise<WorkOrderHierarchySummary | null> {
  const { supabase, companyIds } = await getScopedCompanyIds();
  if (companyIds.length === 0) return null;

  const { data: current } = await supabase
    .from("work_orders")
    .select("id, company_id, parent_work_order_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!current) return null;
  if (!companyIds.includes((current as { company_id?: string }).company_id ?? "")) return null;

  const parentId = (current as { parent_work_order_id?: string | null }).parent_work_order_id;
  if (!parentId) return null;

  const { data: row } = await supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, status, assigned_technician_id, assigned_crew_id, due_date, updated_at, technicians!assigned_technician_id(technician_name, name), crews!assigned_crew_id(name)"
    )
    .eq("id", parentId)
    .maybeSingle();
  if (!row) return null;
  const parent = row as Record<string, unknown>;
  const tech = Array.isArray(parent.technicians) ? parent.technicians[0] : parent.technicians;
  const crew = Array.isArray(parent.crews) ? parent.crews[0] : parent.crews;
  return {
    id: parent.id as string,
    work_order_number: (parent.work_order_number as string | null) ?? null,
    title: (parent.title as string) ?? "Work Order",
    status: (parent.status as string) ?? "new",
    assigned_technician_id: (parent.assigned_technician_id as string | null) ?? null,
    assigned_crew_id: (parent.assigned_crew_id as string | null) ?? null,
    due_date: (parent.due_date as string | null) ?? null,
    updated_at: (parent.updated_at as string | null) ?? null,
    technician_name:
      tech && typeof tech === "object"
        ? ((tech as { technician_name?: string }).technician_name ??
          (tech as { name?: string }).name ??
          null)
        : null,
    crew_name:
      crew && typeof crew === "object"
        ? ((crew as { name?: string }).name ?? null)
        : null,
  };
}

export async function getWorkOrderWithChildren(workOrderId: string): Promise<{
  children: WorkOrderHierarchySummary[];
}> {
  const { supabase, companyIds } = await getScopedCompanyIds();
  if (companyIds.length === 0) return { children: [] };

  const { data: parent } = await supabase
    .from("work_orders")
    .select("id, company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!parent) return { children: [] };
  if (!companyIds.includes((parent as { company_id?: string }).company_id ?? "")) {
    return { children: [] };
  }

  const { data: rows } = await supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, status, assigned_technician_id, assigned_crew_id, due_date, updated_at, technicians!assigned_technician_id(technician_name, name), crews!assigned_crew_id(name)"
    )
    .eq("parent_work_order_id", workOrderId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const children = (rows ?? []).map((row) => {
    const item = row as Record<string, unknown>;
    const tech = Array.isArray(item.technicians) ? item.technicians[0] : item.technicians;
    const crew = Array.isArray(item.crews) ? item.crews[0] : item.crews;
    return {
      id: item.id as string,
      work_order_number: (item.work_order_number as string | null) ?? null,
      title: (item.title as string) ?? "Work Order",
      status: (item.status as string) ?? "new",
      assigned_technician_id: (item.assigned_technician_id as string | null) ?? null,
      assigned_crew_id: (item.assigned_crew_id as string | null) ?? null,
      due_date: (item.due_date as string | null) ?? null,
      updated_at: (item.updated_at as string | null) ?? null,
      technician_name:
        tech && typeof tech === "object"
          ? ((tech as { technician_name?: string }).technician_name ??
            (tech as { name?: string }).name ??
            null)
          : null,
      crew_name:
        crew && typeof crew === "object"
          ? ((crew as { name?: string }).name ?? null)
          : null,
    };
  });

  return { children };
}
