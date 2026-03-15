import type { SupabaseClient } from "@supabase/supabase-js";
import { dateOnlyUTC } from "@/src/lib/date-utils";
import {
  OPEN_ACTIVE_STATUSES,
  TERMINAL_STATUSES_ARRAY,
} from "@/src/lib/work-orders/status";

type DashboardContext = {
  supabase: SupabaseClient;
  companyIds: string[];
};

export type OperationsDashboardData = {
  kpis: {
    openWorkOrders: number;
    inProgressWorkOrders: number;
    completedToday: number;
    overdueWorkOrders: number;
    scheduledToday: number;
    activeTechnicians: number;
    unassignedWorkOrders: number;
  };
  backlog: {
    openWorkOrders: number;
    overdueWorkOrders: number;
    pmNotScheduled: number;
    upcomingPmTasks: number;
  };
  alerts: {
    overdueWorkOrders: {
      id: string;
      work_order_number: string | null;
      title: string;
      due_date: string | null;
      priority: string | null;
      status: string | null;
    }[];
    highPriorityNotStarted: {
      id: string;
      work_order_number: string | null;
      title: string;
      priority: string | null;
      status: string | null;
      scheduled_date: string | null;
    }[];
    pmDueSoon: {
      id: string;
      name: string;
      next_run_date: string | null;
      asset_name: string | null;
    }[];
    lowStock: {
      balance_id: string;
      product_name: string;
      sku: string | null;
      location_name: string;
      quantity_on_hand: number;
      reorder_point: number;
    }[];
    repeatedFailures: {
      asset_id: string;
      asset_name: string;
      failure_count: number;
    }[];
  };
  assetHealth: {
    assetsWithMultipleFailures30d: number;
    assetsOverdueForPm: number;
    assetsNotServicedIn6Months: number;
  };
  technicianActivity: {
    technician_id: string;
    technician_name: string;
    completed_today: number;
    current_assignments: number;
    labor_hours_today: number;
  }[];
};

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function endOfTodayIso(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

export async function loadOperationsDashboardData({
  supabase,
  companyIds,
}: DashboardContext): Promise<OperationsDashboardData> {
  if (companyIds.length === 0) {
    return {
      kpis: {
        openWorkOrders: 0,
        inProgressWorkOrders: 0,
        completedToday: 0,
        overdueWorkOrders: 0,
        scheduledToday: 0,
        activeTechnicians: 0,
        unassignedWorkOrders: 0,
      },
      backlog: {
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        pmNotScheduled: 0,
        upcomingPmTasks: 0,
      },
      alerts: {
        overdueWorkOrders: [],
        highPriorityNotStarted: [],
        pmDueSoon: [],
        lowStock: [],
        repeatedFailures: [],
      },
      assetHealth: {
        assetsWithMultipleFailures30d: 0,
        assetsOverdueForPm: 0,
        assetsNotServicedIn6Months: 0,
      },
      technicianActivity: [],
    };
  }

  const today = dateOnlyUTC(new Date());
  const now = new Date();
  const dueSoonDate = new Date(now);
  dueSoonDate.setDate(dueSoonDate.getDate() + 7);
  const backlogPmWindow = new Date(now);
  backlogPmWindow.setDate(backlogPmWindow.getDate() + 14);
  const failuresWindow = new Date(now);
  failuresWindow.setDate(failuresWindow.getDate() - 30);
  const staleServiceWindow = new Date(now);
  staleServiceWindow.setMonth(staleServiceWindow.getMonth() - 6);
  const startToday = startOfTodayIso();
  const endToday = endOfTodayIso();

  const notTerminalStatus = `(${TERMINAL_STATUSES_ARRAY.join(",")})`;

  const [
    openWorkOrdersCount,
    inProgressCount,
    completedTodayCount,
    overdueCount,
    scheduledTodayCount,
    activeTechniciansCount,
    unassignedCount,
    pmNotScheduledCount,
    upcomingPmCount,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .in("status", [...OPEN_ACTIVE_STATUSES]),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "in_progress"),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "completed")
      .gte("completed_at", startToday)
      .lte("completed_at", endToday),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .lt("due_date", today)
      .not("status", "in", notTerminalStatus),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("scheduled_date", today)
      .not("status", "in", notTerminalStatus),
    supabase
      .from("technicians")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "active"),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .in("status", [...OPEN_ACTIVE_STATUSES])
      .is("assigned_technician_id", null),
    supabase
      .from("preventive_maintenance_plans")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "active")
      .lte("next_run_date", today),
    supabase
      .from("preventive_maintenance_plans")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "active")
      .gte("next_run_date", today)
      .lte("next_run_date", dateOnlyUTC(backlogPmWindow)),
  ]);

  const [overdueRows, highPriorityRows, pmDueSoonRows, failureRows, staleAssetsRows, techniciansRows, assignmentRows, completionRows, overduePmAssetsRows] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("id, work_order_number, title, due_date, priority, status")
        .in("company_id", companyIds)
        .lt("due_date", today)
        .not("status", "in", notTerminalStatus)
        .order("due_date", { ascending: true })
        .limit(8),
      supabase
        .from("work_orders")
        .select("id, work_order_number, title, priority, status, scheduled_date")
        .in("company_id", companyIds)
        .in("priority", ["high", "urgent", "emergency"])
        .in("status", ["new", "ready_to_schedule", "scheduled"])
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("preventive_maintenance_plans")
        .select("id, name, next_run_date, asset_id")
        .in("company_id", companyIds)
        .eq("status", "active")
        .gte("next_run_date", today)
        .lte("next_run_date", dateOnlyUTC(dueSoonDate))
        .order("next_run_date", { ascending: true })
        .limit(8),
      supabase
        .from("work_orders")
        .select("asset_id")
        .in("company_id", companyIds)
        .eq("status", "completed")
        .gte("completed_at", failuresWindow.toISOString())
        .in("category", ["repair", "emergency"])
        .not("asset_id", "is", null),
      supabase
        .from("assets")
        .select("id, last_serviced_at")
        .in("company_id", companyIds),
      supabase
        .from("technicians")
        .select("id, technician_name, name")
        .in("company_id", companyIds)
        .eq("status", "active")
        .order("technician_name"),
      supabase
        .from("work_orders")
        .select("assigned_technician_id")
        .in("company_id", companyIds)
        .in("status", ["ready_to_schedule", "scheduled", "in_progress", "on_hold"])
        .not("assigned_technician_id", "is", null),
      supabase
        .from("work_orders")
        .select("completed_by_technician_id, assigned_technician_id, actual_hours")
        .in("company_id", companyIds)
        .eq("status", "completed")
        .gte("completed_at", startToday)
        .lte("completed_at", endToday),
      supabase
        .from("preventive_maintenance_plans")
        .select("asset_id")
        .in("company_id", companyIds)
        .eq("status", "active")
        .lt("next_run_date", today)
        .not("asset_id", "is", null),
    ]);

  const repeatedFailureCounts = new Map<string, number>();
  for (const row of failureRows.data ?? []) {
    const assetId = (row as { asset_id?: string | null }).asset_id;
    if (!assetId) continue;
    repeatedFailureCounts.set(assetId, (repeatedFailureCounts.get(assetId) ?? 0) + 1);
  }
  const repeatedAssetIds = [...repeatedFailureCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([assetId]) => assetId);

  const { data: repeatedAssetsRows } = repeatedAssetIds.length
    ? await supabase
        .from("assets")
        .select("id, asset_name, name")
        .in("id", repeatedAssetIds)
    : { data: [] as unknown[] };
  const repeatedAssetsById = new Map(
    (repeatedAssetsRows ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { asset_name?: string; name?: string }).asset_name ??
        (row as { name?: string }).name ??
        "Asset",
    ])
  );

  const repeatedFailures = repeatedAssetIds.slice(0, 8).map((assetId) => ({
    asset_id: assetId,
    asset_name: repeatedAssetsById.get(assetId) ?? "Asset",
    failure_count: repeatedFailureCounts.get(assetId) ?? 0,
  }));

  const pmDueSoonAssetIds = Array.from(
    new Set(
      (pmDueSoonRows.data ?? [])
        .map((row) => (row as { asset_id?: string | null }).asset_id)
        .filter(Boolean) as string[]
    )
  );
  const { data: pmAssetsRows } = pmDueSoonAssetIds.length
    ? await supabase
        .from("assets")
        .select("id, asset_name, name")
        .in("id", pmDueSoonAssetIds)
    : { data: [] as unknown[] };
  const pmAssetById = new Map(
    (pmAssetsRows ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { asset_name?: string; name?: string }).asset_name ??
        (row as { name?: string }).name ??
        "Asset",
    ])
  );

  const pmDueSoon = (pmDueSoonRows.data ?? []).map((row) => {
    const plan = row as {
      id: string;
      name: string;
      next_run_date?: string | null;
      asset_id?: string | null;
    };
    return {
      id: plan.id,
      name: plan.name,
      next_run_date: plan.next_run_date ?? null,
      asset_name: plan.asset_id ? pmAssetById.get(plan.asset_id) ?? null : null,
    };
  });

  const { data: stockLocationRows } = await supabase
    .from("stock_locations")
    .select("id, name")
    .in("company_id", companyIds)
    .eq("active", true);
  const stockLocationIds = (stockLocationRows ?? []).map((row) => (row as { id: string }).id);
  const locationNameById = new Map(
    (stockLocationRows ?? []).map((row) => [(row as { id: string }).id, (row as { name: string }).name])
  );
  const { data: lowStockRawRows } = stockLocationIds.length
    ? await supabase
        .from("inventory_balances")
        .select("id, stock_location_id, quantity_on_hand, reorder_point, products(name, sku)")
        .in("stock_location_id", stockLocationIds)
        .not("reorder_point", "is", null)
        .order("updated_at", { ascending: false })
        .limit(200)
    : { data: [] as unknown[] };
  const lowStock = (lowStockRawRows ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const product = Array.isArray(record.products) ? (record.products as unknown[])[0] : record.products;
      const quantity = Number((record.quantity_on_hand as number | null) ?? 0);
      const reorder = Number((record.reorder_point as number | null) ?? 0);
      return {
        balance_id: record.id as string,
        product_name:
          product && typeof product === "object" && "name" in (product as Record<string, unknown>)
            ? ((product as { name?: string }).name ?? "Product")
            : "Product",
        sku:
          product && typeof product === "object" && "sku" in (product as Record<string, unknown>)
            ? ((product as { sku?: string | null }).sku ?? null)
            : null,
        location_name: locationNameById.get((record.stock_location_id as string) ?? "") ?? "Location",
        quantity_on_hand: quantity,
        reorder_point: reorder,
      };
    })
    .filter((row) => row.reorder_point > 0 && row.quantity_on_hand < row.reorder_point)
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand)
    .slice(0, 8);

  const staleAssets = (staleAssetsRows.data ?? []).filter((row) => {
    const lastServiced = (row as { last_serviced_at?: string | null }).last_serviced_at;
    if (!lastServiced) return true;
    return new Date(lastServiced) < staleServiceWindow;
  });

  const overduePmAssetIds = new Set(
    (overduePmAssetsRows.data ?? [])
      .map((row) => (row as { asset_id?: string | null }).asset_id)
      .filter(Boolean) as string[]
  );

  const assignmentCountByTechnician = new Map<string, number>();
  for (const row of assignmentRows.data ?? []) {
    const technicianId = (row as { assigned_technician_id?: string | null })
      .assigned_technician_id;
    if (!technicianId) continue;
    assignmentCountByTechnician.set(
      technicianId,
      (assignmentCountByTechnician.get(technicianId) ?? 0) + 1
    );
  }

  const completionCountByTechnician = new Map<string, number>();
  const laborHoursByTechnician = new Map<string, number>();
  for (const row of completionRows.data ?? []) {
    const payload = row as {
      completed_by_technician_id?: string | null;
      assigned_technician_id?: string | null;
      actual_hours?: number | null;
    };
    const technicianId =
      payload.completed_by_technician_id ?? payload.assigned_technician_id ?? null;
    if (!technicianId) continue;
    completionCountByTechnician.set(
      technicianId,
      (completionCountByTechnician.get(technicianId) ?? 0) + 1
    );
    laborHoursByTechnician.set(
      technicianId,
      (laborHoursByTechnician.get(technicianId) ?? 0) + Number(payload.actual_hours ?? 0)
    );
  }

  const technicianActivity = (techniciansRows.data ?? [])
    .map((row) => {
      const technician = row as { id: string; technician_name?: string; name?: string };
      return {
        technician_id: technician.id,
        technician_name:
          technician.technician_name ?? technician.name ?? `Technician ${technician.id.slice(0, 8)}`,
        completed_today: completionCountByTechnician.get(technician.id) ?? 0,
        current_assignments: assignmentCountByTechnician.get(technician.id) ?? 0,
        labor_hours_today: Number(
          (laborHoursByTechnician.get(technician.id) ?? 0).toFixed(2)
        ),
      };
    })
    .sort((a, b) => {
      if (b.completed_today !== a.completed_today) return b.completed_today - a.completed_today;
      if (b.current_assignments !== a.current_assignments) {
        return b.current_assignments - a.current_assignments;
      }
      return a.technician_name.localeCompare(b.technician_name);
    });

  return {
    kpis: {
      openWorkOrders: openWorkOrdersCount.count ?? 0,
      inProgressWorkOrders: inProgressCount.count ?? 0,
      completedToday: completedTodayCount.count ?? 0,
      overdueWorkOrders: overdueCount.count ?? 0,
      scheduledToday: scheduledTodayCount.count ?? 0,
      activeTechnicians: activeTechniciansCount.count ?? 0,
      unassignedWorkOrders: unassignedCount.count ?? 0,
    },
    backlog: {
      openWorkOrders: openWorkOrdersCount.count ?? 0,
      overdueWorkOrders: overdueCount.count ?? 0,
      pmNotScheduled: pmNotScheduledCount.count ?? 0,
      upcomingPmTasks: upcomingPmCount.count ?? 0,
    },
    alerts: {
      overdueWorkOrders: (overdueRows.data ?? []) as {
        id: string;
        work_order_number: string | null;
        title: string;
        due_date: string | null;
        priority: string | null;
        status: string | null;
      }[],
      highPriorityNotStarted: (highPriorityRows.data ?? []) as {
        id: string;
        work_order_number: string | null;
        title: string;
        priority: string | null;
        status: string | null;
        scheduled_date: string | null;
      }[],
      pmDueSoon,
      lowStock,
      repeatedFailures,
    },
    assetHealth: {
      assetsWithMultipleFailures30d: repeatedAssetIds.length,
      assetsOverdueForPm: overduePmAssetIds.size,
      assetsNotServicedIn6Months: staleAssets.length,
    },
    technicianActivity,
  };
}
