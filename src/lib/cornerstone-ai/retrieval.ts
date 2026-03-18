/**
 * Tenant-scoped retrieval tools for Cornerstone AI.
 * Server-only. Call with supabase + companyIds from getCompanyIdsForUser.
 * Do not expose raw DB to the model; return structured summaries for prompts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const today = () => new Date().toISOString().slice(0, 10);
const startOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
};

export type WorkOrderSummaryRow = {
  id: string;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  company_name: string | null;
  location: string | null;
  assigned_to: string | null;
  description?: string | null;
};

export async function getOpenWorkOrderSummary(
  supabase: SupabaseClient,
  companyIds: string[],
  filters?: { overdue?: boolean; dueToday?: boolean; priority?: string; limit?: number }
): Promise<WorkOrderSummaryRow[]> {
  if (companyIds.length === 0) return [];
  const limit = Math.min(filters?.limit ?? 25, 50);
  let q = supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, status, priority, due_date, companies(name), properties(property_name), buildings(building_name), units(unit_name), technicians(technician_name), crews(name)"
    )
    .in("company_id", companyIds)
    .not("status", "in", "(completed,cancelled)")
    .order("due_date", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (filters?.overdue) q = q.lt("due_date", today());
  if (filters?.dueToday) q = q.eq("due_date", today());
  if (filters?.priority) q = q.eq("priority", filters.priority);

  const { data } = await q;
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => {
    const comp = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const bld = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    const un = Array.isArray(r.units) ? r.units[0] : r.units;
    const tech = Array.isArray(r.technicians) ? r.technicians[0] : r.technicians;
    const crew = Array.isArray(r.crews) ? r.crews[0] : r.crews;
    const locParts = [prop && (prop as { property_name?: string }).property_name, bld && (bld as { building_name?: string }).building_name, un && (un as { unit_name?: string }).unit_name].filter(Boolean);
    const assigned = [tech && (tech as { technician_name?: string }).technician_name, crew && (crew as { name?: string }).name].filter(Boolean).join(" / ") || null;
    return {
      id: r.id as string,
      work_order_number: (r.work_order_number as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      status: (r.status as string | null) ?? null,
      priority: (r.priority as string | null) ?? null,
      due_date: (r.due_date as string | null) ?? null,
      company_name: comp && (comp as { name?: string }).name ? (comp as { name: string }).name : null,
      location: locParts.length ? locParts.join(" / ") : null,
      assigned_to: assigned || null,
    };
  });
}

export async function getDuePmSummary(
  supabase: SupabaseClient,
  companyIds: string[],
  options?: { dueBy?: string; limit?: number }
): Promise<{ id: string; name: string | null; asset_name: string | null; next_run_date: string | null }[]> {
  if (companyIds.length === 0) return [];
  const dueBy = options?.dueBy ?? today();
  const limit = Math.min(options?.limit ?? 20, 50);
  const { data } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, name, next_run_date, assets(asset_name, name)")
    .in("company_id", companyIds)
    .eq("status", "active")
    .lte("next_run_date", dueBy)
    .not("next_run_date", "is", null)
    .order("next_run_date", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => {
    const ast = Array.isArray(r.assets) ? r.assets[0] : r.assets;
    const assetName = ast && typeof ast === "object" && "asset_name" in ast
      ? ((ast as { asset_name?: string }).asset_name ?? (ast as { name?: string }).name)
      : null;
    return {
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      asset_name: assetName ?? null,
      next_run_date: (r.next_run_date as string | null) ?? null,
    };
  });
}

export async function getWorkOrderSummaryContext(
  supabase: SupabaseClient,
  companyIds: string[],
  workOrderId: string
): Promise<{ workOrder: WorkOrderSummaryRow; notesExcerpt?: string } | null> {
  if (companyIds.length === 0) return null;
  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, work_order_number, title, status, priority, due_date, description, scheduled_date, companies(name), properties(property_name), buildings(building_name), units(unit_name), technicians(technician_name), crews(name)")
    .eq("id", workOrderId)
    .in("company_id", companyIds)
    .maybeSingle();
  if (!wo) return null;
  const r = wo as Record<string, unknown>;
  const comp = Array.isArray(r.companies) ? r.companies[0] : r.companies;
  const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
  const bld = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
  const un = Array.isArray(r.units) ? r.units[0] : r.units;
  const tech = Array.isArray(r.technicians) ? r.technicians[0] : r.technicians;
  const crew = Array.isArray(r.crews) ? r.crews[0] : r.crews;
  const locParts = [prop && (prop as { property_name?: string }).property_name, bld && (bld as { building_name?: string }).building_name, un && (un as { unit_name?: string }).unit_name].filter(Boolean);
  const assigned = [tech && (tech as { technician_name?: string }).technician_name, crew && (crew as { name?: string }).name].filter(Boolean).join(" / ") || null;
  const workOrder: WorkOrderSummaryRow = {
    id: r.id as string,
    work_order_number: (r.work_order_number as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    priority: (r.priority as string | null) ?? null,
    due_date: (r.due_date as string | null) ?? null,
    company_name: comp && (comp as { name?: string }).name ? (comp as { name: string }).name : null,
    location: locParts.length ? locParts.join(" / ") : null,
    assigned_to: assigned || null,
    description: (r.description as string | null) ?? null,
  };
  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("body")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .limit(3);
  const notesExcerpt = (notes ?? []).length
    ? (notes as { body?: string }[]).map((n) => n.body ?? "").join(" | ").slice(0, 500)
    : undefined;
  return { workOrder, notesExcerpt };
}

export type AssetSummaryRow = {
  id: string;
  name: string | null;
  status: string | null;
  condition: string | null;
  asset_type: string | null;
  location: string | null;
  health_score: number | null;
  work_order_count: number;
  pm_due_next: string | null;
};

export async function getAssetSummaryContext(
  supabase: SupabaseClient,
  companyIds: string[],
  assetId: string
): Promise<AssetSummaryRow | null> {
  if (companyIds.length === 0) return null;
  const { data: asset } = await supabase
    .from("assets")
    .select("id, asset_name, name, status, condition, asset_type, health_score, properties(property_name), buildings(building_name), units(unit_name)")
    .eq("id", assetId)
    .in("company_id", companyIds)
    .maybeSingle();
  if (!asset) return null;
  const r = asset as Record<string, unknown>;
  const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
  const bld = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
  const un = Array.isArray(r.units) ? r.units[0] : r.units;
  const locParts = [prop && (prop as { property_name?: string }).property_name, bld && (bld as { building_name?: string }).building_name, un && (un as { unit_name?: string }).unit_name].filter(Boolean);
  const { count: woCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);
  const { data: pm } = await supabase
    .from("preventive_maintenance_plans")
    .select("next_run_date")
    .eq("asset_id", assetId)
    .eq("status", "active")
    .not("next_run_date", "is", null)
    .order("next_run_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return {
    id: r.id as string,
    name: (r.asset_name as string | null) ?? (r.name as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    condition: (r.condition as string | null) ?? null,
    asset_type: (r.asset_type as string | null) ?? null,
    location: locParts.length ? locParts.join(" / ") : null,
    health_score: (r.health_score as number | null) ?? null,
    work_order_count: woCount ?? 0,
    pm_due_next: (pm as { next_run_date?: string } | null)?.next_run_date ?? null,
  };
}

/** High-level counts for list summary (e.g. open work orders by priority/status). */
export async function getListSummaryContext(
  supabase: SupabaseClient,
  companyIds: string[],
  entityType: "work_orders" | "assets",
  filters?: { status?: string; priority?: string }
): Promise<{ total: number; byStatus: Record<string, number>; byPriority?: Record<string, number> }> {
  if (companyIds.length === 0) return { total: 0, byStatus: {} };
  if (entityType === "work_orders") {
    let q = supabase
      .from("work_orders")
      .select("id, status, priority")
      .in("company_id", companyIds)
      .not("status", "in", "(completed,cancelled)");
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.priority) q = q.eq("priority", filters.priority);
    const { data } = await q;
    const rows = (data ?? []) as { status?: string; priority?: string }[];
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const r of rows) {
      const s = r.status ?? "unknown";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
      const p = r.priority ?? "medium";
      byPriority[p] = (byPriority[p] ?? 0) + 1;
    }
    return { total: rows.length, byStatus, byPriority };
  }
  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds)
    .eq("status", filters?.status ?? "active");
  return { total: count ?? 0, byStatus: { active: count ?? 0 } };
}

/** Technician workload: count of open/scheduled work orders per technician (for "who is overloaded"). */
export async function getTechnicianWorkloadSummary(
  supabase: SupabaseClient,
  companyIds: string[],
  dateRange?: { from: string; to: string }
): Promise<{ technician_id: string; technician_name: string | null; open_count: number }[]> {
  if (companyIds.length === 0) return [];
  const from = dateRange?.from ?? today();
  const to = dateRange?.to ?? today();
  const { data } = await supabase
    .from("work_orders")
    .select("assigned_technician_id, technicians(technician_name, name)")
    .in("company_id", companyIds)
    .not("status", "in", "(completed,cancelled)")
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);

  const rows = (data ?? []) as Record<string, unknown>[];
  const byTech = new Map<string, { name: string | null; count: number }>();
  for (const r of rows) {
    const tid = (r.assigned_technician_id as string) ?? "unassigned";
    const t = Array.isArray(r.technicians) ? r.technicians[0] : r.technicians;
    const name = t && typeof t === "object" ? ((t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name) ?? null : null;
    const cur = byTech.get(tid) ?? { name, count: 0 };
    cur.count += 1;
    byTech.set(tid, cur);
  }
  return Array.from(byTech.entries()).map(([technician_id, v]) => ({
    technician_id,
    technician_name: v.name,
    open_count: v.count,
  }));
}
