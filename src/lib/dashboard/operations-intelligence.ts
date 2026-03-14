import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardContext = {
  supabase: SupabaseClient;
  companyIds: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export type OperationsReportType =
  | "maintenance_cost_by_asset"
  | "maintenance_cost_by_building"
  | "work_orders_by_technician"
  | "work_orders_by_property"
  | "asset_failure_rate";

export type PmComplianceTask = {
  id: string;
  name: string;
  next_run_date: string | null;
  asset_name: string | null;
};

export type OperationsIntelligenceData = {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  pmCompliance: {
    completedOnTime: number;
    completedLate: number;
    missed: number;
    /** When null, no PM runs exist yet — show "—" or "No PM data" instead of a percentage. */
    compliancePercentage: number | null;
    upcomingTasks: PmComplianceTask[];
    overdueTasks: PmComplianceTask[];
  };
  reports: {
    maintenanceCostByAsset: {
      asset_id: string;
      asset_name: string;
      property_name: string | null;
      building_name: string | null;
      work_order_count: number;
      parts_cost: number;
      labor_cost: number;
      vendor_cost: number;
      total_cost: number;
    }[];
    maintenanceCostByBuilding: {
      building_id: string;
      building_name: string;
      property_name: string | null;
      work_order_count: number;
      total_cost: number;
    }[];
    workOrdersByTechnician: {
      technician_id: string | null;
      technician_name: string;
      work_order_count: number;
      completed_count: number;
    }[];
    workOrdersByProperty: {
      property_id: string;
      property_name: string;
      work_order_count: number;
      completed_count: number;
      total_cost: number;
    }[];
    assetFailureRate: {
      asset_id: string;
      asset_name: string;
      failure_work_orders: number;
      total_work_orders: number;
      failure_rate: number;
    }[];
  };
  propertyIntelligence: {
    maintenanceCostPerProperty: {
      property_id: string;
      property_name: string;
      total_cost: number;
      work_order_count: number;
    }[];
    maintenanceCostPerBuilding: {
      building_id: string;
      building_name: string;
      property_name: string | null;
      total_cost: number;
      work_order_count: number;
    }[];
    workOrderVolumeByProperty: {
      property_id: string;
      property_name: string;
      work_order_count: number;
      completed_count: number;
    }[];
    mostExpensiveAssets: {
      asset_id: string;
      asset_name: string;
      total_cost: number;
      work_order_count: number;
    }[];
    costTrends: {
      month: string;
      total_cost: number;
    }[];
    repairFrequency: {
      month: string;
      repair_count: number;
    }[];
  };
};

export type ReportDataset = {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
};

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function addDays(baseDate: string, days: number): string {
  const base = new Date(`${baseDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return dateOnly(base);
}

function monthKeyFromIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

function formatMonthLabel(key: string): string {
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return key;
  }
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFailureCategory(category: string | null | undefined): boolean {
  const normalized = String(category ?? "").toLowerCase();
  return normalized === "repair" || normalized === "emergency";
}

function reportTypeTitle(type: OperationsReportType): string {
  if (type === "maintenance_cost_by_asset") return "Maintenance Cost by Asset";
  if (type === "maintenance_cost_by_building") return "Maintenance Cost by Building";
  if (type === "work_orders_by_technician") return "Work Orders by Technician";
  if (type === "work_orders_by_property") return "Work Orders by Property";
  return "Asset Failure Rate";
}

function buildMonthRange(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= limit) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export async function loadOperationsIntelligenceData({
  supabase,
  companyIds,
  startDate,
  endDate,
}: DashboardContext): Promise<OperationsIntelligenceData> {
  const today = dateOnly(new Date());
  const defaultEnd = today;
  const startBase = new Date();
  startBase.setUTCDate(1);
  startBase.setUTCMonth(startBase.getUTCMonth() - 11);
  const defaultStart = dateOnly(startBase);
  const resolvedStartDate = parseDateOnly(startDate, defaultStart);
  const resolvedEndDate = parseDateOnly(endDate, defaultEnd);

  if (companyIds.length === 0) {
    return {
      dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate },
      pmCompliance: {
        completedOnTime: 0,
        completedLate: 0,
        missed: 0,
        compliancePercentage: null,
        upcomingTasks: [],
        overdueTasks: [],
      },
      reports: {
        maintenanceCostByAsset: [],
        maintenanceCostByBuilding: [],
        workOrdersByTechnician: [],
        workOrdersByProperty: [],
        assetFailureRate: [],
      },
      propertyIntelligence: {
        maintenanceCostPerProperty: [],
        maintenanceCostPerBuilding: [],
        workOrderVolumeByProperty: [],
        mostExpensiveAssets: [],
        costTrends: [],
        repairFrequency: [],
      },
    };
  }

  const complianceStartDate = addDays(today, -90);
  const pmUpcomingUntil = addDays(today, 30);

  const [
    workOrdersResult,
    assetsResult,
    propertiesResult,
    buildingsResult,
    techniciansResult,
    pmPlansResult,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, work_order_number, title, asset_id, property_id, building_id, assigned_technician_id, completed_by_technician_id, status, category, created_at, completed_at, actual_hours, vendor_cost, response_time_minutes"
      )
      .in("company_id", companyIds)
      .gte("created_at", `${resolvedStartDate}T00:00:00.000Z`)
      .lte("created_at", `${resolvedEndDate}T23:59:59.999Z`),
    supabase
      .from("assets")
      .select("id, asset_name, name, property_id, building_id")
      .in("company_id", companyIds),
    supabase
      .from("properties")
      .select("id, property_name, name")
      .in("company_id", companyIds),
    supabase
      .from("buildings")
      .select("id, building_name, name, property_id")
      .in("company_id", companyIds),
    supabase
      .from("technicians")
      .select("id, technician_name, name, hourly_cost")
      .in("company_id", companyIds),
    supabase
      .from("preventive_maintenance_plans")
      .select("id, name, next_run_date, asset_id, status")
      .in("company_id", companyIds),
  ]);

  const workOrders = (workOrdersResult.data ?? []) as Array<
    Record<string, unknown>
  >;
  const assets = (assetsResult.data ?? []) as Array<Record<string, unknown>>;
  const properties = (propertiesResult.data ?? []) as Array<Record<string, unknown>>;
  const buildings = (buildingsResult.data ?? []) as Array<Record<string, unknown>>;
  const technicians = (techniciansResult.data ?? []) as Array<Record<string, unknown>>;
  const pmPlans = (pmPlansResult.data ?? []) as Array<Record<string, unknown>>;

  const pmPlanIds = pmPlans.map((row) => String(row.id));
  let pmRuns: Array<Record<string, unknown>> = [];
  if (pmPlanIds.length > 0) {
    const pmRunsResult = await supabase
      .from("preventive_maintenance_runs")
      .select("id, preventive_maintenance_plan_id, scheduled_date, generated_work_order_id, status")
      .in("preventive_maintenance_plan_id", pmPlanIds)
      .gte("scheduled_date", complianceStartDate)
      .lte("scheduled_date", today);
    pmRuns = (pmRunsResult.data ?? []) as Array<Record<string, unknown>>;
  }

  const workOrderIds = workOrders.map((row) => String(row.id));
  const partsCostByWorkOrder = new Map<string, number>();
  if (workOrderIds.length > 0) {
    const chunkSize = 250;
    for (let index = 0; index < workOrderIds.length; index += chunkSize) {
      const idsChunk = workOrderIds.slice(index, index + chunkSize);
      const partUsageResult = await supabase
        .from("work_order_part_usage")
        .select("work_order_id, total_cost")
        .in("work_order_id", idsChunk);
      for (const row of partUsageResult.data ?? []) {
        const record = row as { work_order_id?: string; total_cost?: number | null };
        const workOrderId = record.work_order_id;
        if (!workOrderId) continue;
        partsCostByWorkOrder.set(
          workOrderId,
          (partsCostByWorkOrder.get(workOrderId) ?? 0) + toNumber(record.total_cost)
        );
      }
    }
  }

  const assetById = new Map(
    assets.map((row) => [
      String(row.id),
      {
        name:
          (row.asset_name as string | null | undefined) ??
          (row.name as string | null | undefined) ??
          "Asset",
        propertyId: (row.property_id as string | null | undefined) ?? null,
        buildingId: (row.building_id as string | null | undefined) ?? null,
      },
    ])
  );
  const propertyById = new Map(
    properties.map((row) => [
      String(row.id),
      (row.property_name as string | null | undefined) ??
        (row.name as string | null | undefined) ??
        "Property",
    ])
  );
  const buildingById = new Map(
    buildings.map((row) => [
      String(row.id),
      {
        name:
          (row.building_name as string | null | undefined) ??
          (row.name as string | null | undefined) ??
          "Building",
        propertyId: (row.property_id as string | null | undefined) ?? null,
      },
    ])
  );
  const technicianById = new Map(
    technicians.map((row) => [
      String(row.id),
      {
        name:
          (row.technician_name as string | null | undefined) ??
          (row.name as string | null | undefined) ??
          "Technician",
        hourlyCost: toNumber(row.hourly_cost),
      },
    ])
  );

  const monthKeys = buildMonthRange(resolvedStartDate, resolvedEndDate);
  const costByMonth = new Map<string, number>(
    monthKeys.map((key) => [key, 0] as const)
  );
  const repairsByMonth = new Map<string, number>(
    monthKeys.map((key) => [key, 0] as const)
  );

  const assetCostAggregate = new Map<
    string,
    {
      asset_id: string;
      asset_name: string;
      property_name: string | null;
      building_name: string | null;
      work_order_count: number;
      parts_cost: number;
      labor_cost: number;
      vendor_cost: number;
      total_cost: number;
    }
  >();
  const buildingCostAggregate = new Map<
    string,
    {
      building_id: string;
      building_name: string;
      property_name: string | null;
      work_order_count: number;
      total_cost: number;
    }
  >();
  const technicianAggregate = new Map<
    string,
    {
      technician_id: string | null;
      technician_name: string;
      work_order_count: number;
      completed_count: number;
    }
  >();
  const propertyAggregate = new Map<
    string,
    {
      property_id: string;
      property_name: string;
      work_order_count: number;
      completed_count: number;
      total_cost: number;
    }
  >();
  const assetFailureAggregate = new Map<
    string,
    {
      asset_id: string;
      asset_name: string;
      failure_work_orders: number;
      total_work_orders: number;
      failure_rate: number;
    }
  >();

  const workOrderCompletionById = new Map<
    string,
    { status: string | null; completed_at: string | null }
  >();

  for (const row of workOrders) {
    const workOrderId = String(row.id);
    const status = (row.status as string | null | undefined) ?? null;
    const category = (row.category as string | null | undefined) ?? null;
    const assetId = (row.asset_id as string | null | undefined) ?? null;
    let propertyId = (row.property_id as string | null | undefined) ?? null;
    let buildingId = (row.building_id as string | null | undefined) ?? null;
    if (!buildingId && assetId) {
      buildingId = assetById.get(assetId)?.buildingId ?? null;
    }
    if (!propertyId && buildingId) {
      propertyId = buildingById.get(buildingId)?.propertyId ?? null;
    }
    if (!propertyId && assetId) {
      propertyId = assetById.get(assetId)?.propertyId ?? null;
    }

    const partsCost = partsCostByWorkOrder.get(workOrderId) ?? 0;
    const vendorCost = toNumber(row.vendor_cost);
    const actualHours = toNumber(row.actual_hours);
    const laborTechnicianId =
      (row.completed_by_technician_id as string | null | undefined) ??
      (row.assigned_technician_id as string | null | undefined) ??
      null;
    const hourlyCost = laborTechnicianId
      ? technicianById.get(laborTechnicianId)?.hourlyCost ?? 0
      : 0;
    const laborCost = actualHours > 0 && hourlyCost > 0 ? actualHours * hourlyCost : 0;
    const totalCost = partsCost + vendorCost + laborCost;

    const monthKey =
      monthKeyFromIso((row.completed_at as string | null | undefined) ?? null) ??
      monthKeyFromIso((row.created_at as string | null | undefined) ?? null);
    if (monthKey && costByMonth.has(monthKey)) {
      costByMonth.set(monthKey, (costByMonth.get(monthKey) ?? 0) + totalCost);
      if (isFailureCategory(category)) {
        repairsByMonth.set(monthKey, (repairsByMonth.get(monthKey) ?? 0) + 1);
      }
    }

    if (assetId) {
      const existing =
        assetCostAggregate.get(assetId) ??
        {
          asset_id: assetId,
          asset_name: assetById.get(assetId)?.name ?? "Asset",
          property_name: propertyId ? propertyById.get(propertyId) ?? null : null,
          building_name: buildingId ? buildingById.get(buildingId)?.name ?? null : null,
          work_order_count: 0,
          parts_cost: 0,
          labor_cost: 0,
          vendor_cost: 0,
          total_cost: 0,
        };
      existing.work_order_count += 1;
      existing.parts_cost += partsCost;
      existing.labor_cost += laborCost;
      existing.vendor_cost += vendorCost;
      existing.total_cost += totalCost;
      assetCostAggregate.set(assetId, existing);

      const failure = isFailureCategory(category);
      const failureEntry =
        assetFailureAggregate.get(assetId) ??
        {
          asset_id: assetId,
          asset_name: assetById.get(assetId)?.name ?? "Asset",
          failure_work_orders: 0,
          total_work_orders: 0,
          failure_rate: 0,
        };
      failureEntry.total_work_orders += 1;
      if (failure) failureEntry.failure_work_orders += 1;
      assetFailureAggregate.set(assetId, failureEntry);
    }

    if (buildingId) {
      const existing =
        buildingCostAggregate.get(buildingId) ??
        {
          building_id: buildingId,
          building_name: buildingById.get(buildingId)?.name ?? "Building",
          property_name:
            propertyId != null ? propertyById.get(propertyId) ?? null : null,
          work_order_count: 0,
          total_cost: 0,
        };
      existing.work_order_count += 1;
      existing.total_cost += totalCost;
      buildingCostAggregate.set(buildingId, existing);
    }

    if (propertyId) {
      const existing =
        propertyAggregate.get(propertyId) ??
        {
          property_id: propertyId,
          property_name: propertyById.get(propertyId) ?? "Property",
          work_order_count: 0,
          completed_count: 0,
          total_cost: 0,
        };
      existing.work_order_count += 1;
      if (status === "completed") existing.completed_count += 1;
      existing.total_cost += totalCost;
      propertyAggregate.set(propertyId, existing);
    }

    const technicianId =
      (row.completed_by_technician_id as string | null | undefined) ??
      (row.assigned_technician_id as string | null | undefined) ??
      null;
    const key = technicianId ?? "unassigned";
    const existingTech =
      technicianAggregate.get(key) ??
      {
        technician_id: technicianId,
        technician_name: technicianId
          ? technicianById.get(technicianId)?.name ?? "Technician"
          : "Unassigned",
        work_order_count: 0,
        completed_count: 0,
      };
    existingTech.work_order_count += 1;
    if (status === "completed") existingTech.completed_count += 1;
    technicianAggregate.set(key, existingTech);

    workOrderCompletionById.set(workOrderId, {
      status,
      completed_at: (row.completed_at as string | null | undefined) ?? null,
    });
  }

  for (const entry of assetFailureAggregate.values()) {
    entry.failure_rate =
      entry.total_work_orders > 0
        ? Number(((entry.failure_work_orders / entry.total_work_orders) * 100).toFixed(2))
        : 0;
  }

  const generatedWorkOrderIds = Array.from(
    new Set(
      pmRuns
        .map((row) => (row.generated_work_order_id as string | null | undefined) ?? null)
        .filter(Boolean) as string[]
    )
  );
  const missingGeneratedWorkOrderIds = generatedWorkOrderIds.filter(
    (id) => !workOrderCompletionById.has(id)
  );
  if (missingGeneratedWorkOrderIds.length > 0) {
    const chunkSize = 250;
    for (
      let index = 0;
      index < missingGeneratedWorkOrderIds.length;
      index += chunkSize
    ) {
      const idsChunk = missingGeneratedWorkOrderIds.slice(index, index + chunkSize);
      const response = await supabase
        .from("work_orders")
        .select("id, status, completed_at")
        .in("id", idsChunk)
        .in("company_id", companyIds);
      for (const row of response.data ?? []) {
        const record = row as { id: string; status?: string | null; completed_at?: string | null };
        workOrderCompletionById.set(record.id, {
          status: record.status ?? null,
          completed_at: record.completed_at ?? null,
        });
      }
    }
  }

  let completedOnTime = 0;
  let completedLate = 0;
  let missed = 0;
  const todayMs = new Date(`${today}T00:00:00.000Z`).getTime();
  for (const row of pmRuns) {
    const scheduledDate = (row.scheduled_date as string | null | undefined) ?? null;
    if (!scheduledDate) continue;
    const scheduledMs = new Date(`${scheduledDate}T00:00:00.000Z`).getTime();
    if (!Number.isFinite(scheduledMs) || scheduledMs > todayMs) continue;

    const generatedWorkOrderId =
      (row.generated_work_order_id as string | null | undefined) ?? null;
    const runStatus = String((row.status as string | null | undefined) ?? "").toLowerCase();
    const completion = generatedWorkOrderId
      ? workOrderCompletionById.get(generatedWorkOrderId) ?? null
      : null;

    if (completion?.completed_at) {
      const completedDate = completion.completed_at.slice(0, 10);
      if (completedDate <= scheduledDate) completedOnTime += 1;
      else completedLate += 1;
      continue;
    }

    if (runStatus === "failed" || runStatus === "skipped" || scheduledMs < todayMs) {
      missed += 1;
    }
  }
  const complianceDenominator = completedOnTime + completedLate + missed;
  const compliancePercentage: number | null =
    complianceDenominator > 0
      ? Number(((completedOnTime / complianceDenominator) * 100).toFixed(2))
      : null;

  const upcomingTasks = pmPlans
    .filter((row) => {
      const status = (row.status as string | null | undefined) ?? null;
      const nextRunDate = (row.next_run_date as string | null | undefined) ?? null;
      return status === "active" && nextRunDate != null && nextRunDate >= today && nextRunDate <= pmUpcomingUntil;
    })
    .sort((a, b) =>
      String((a.next_run_date as string | null | undefined) ?? "").localeCompare(
        String((b.next_run_date as string | null | undefined) ?? "")
      )
    )
    .slice(0, 10)
    .map((row) => {
      const assetId = (row.asset_id as string | null | undefined) ?? null;
      return {
        id: String(row.id),
        name: (row.name as string | null | undefined) ?? "PM Plan",
        next_run_date: (row.next_run_date as string | null | undefined) ?? null,
        asset_name: assetId ? assetById.get(assetId)?.name ?? null : null,
      };
    });

  const overdueTasks = pmPlans
    .filter((row) => {
      const status = (row.status as string | null | undefined) ?? null;
      const nextRunDate = (row.next_run_date as string | null | undefined) ?? null;
      return status === "active" && nextRunDate != null && nextRunDate < today;
    })
    .sort((a, b) =>
      String((a.next_run_date as string | null | undefined) ?? "").localeCompare(
        String((b.next_run_date as string | null | undefined) ?? "")
      )
    )
    .slice(0, 10)
    .map((row) => {
      const assetId = (row.asset_id as string | null | undefined) ?? null;
      return {
        id: String(row.id),
        name: (row.name as string | null | undefined) ?? "PM Plan",
        next_run_date: (row.next_run_date as string | null | undefined) ?? null,
        asset_name: assetId ? assetById.get(assetId)?.name ?? null : null,
      };
    });

  const maintenanceCostByAsset = Array.from(assetCostAggregate.values()).sort(
    (a, b) => b.total_cost - a.total_cost
  );
  const maintenanceCostByBuilding = Array.from(buildingCostAggregate.values()).sort(
    (a, b) => b.total_cost - a.total_cost
  );
  const workOrdersByTechnician = Array.from(technicianAggregate.values()).sort(
    (a, b) => b.work_order_count - a.work_order_count
  );
  const workOrdersByProperty = Array.from(propertyAggregate.values()).sort(
    (a, b) => b.work_order_count - a.work_order_count
  );
  const assetFailureRate = Array.from(assetFailureAggregate.values()).sort((a, b) => {
    if (b.failure_rate !== a.failure_rate) return b.failure_rate - a.failure_rate;
    return b.failure_work_orders - a.failure_work_orders;
  });

  const costTrends = monthKeys.map((key) => ({
    month: formatMonthLabel(key),
    total_cost: Number((costByMonth.get(key) ?? 0).toFixed(2)),
  }));
  const repairFrequency = monthKeys.map((key) => ({
    month: formatMonthLabel(key),
    repair_count: repairsByMonth.get(key) ?? 0,
  }));

  return {
    dateRange: {
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    },
    pmCompliance: {
      completedOnTime,
      completedLate,
      missed,
      compliancePercentage,
      upcomingTasks,
      overdueTasks,
    },
    reports: {
      maintenanceCostByAsset,
      maintenanceCostByBuilding,
      workOrdersByTechnician,
      workOrdersByProperty,
      assetFailureRate,
    },
    propertyIntelligence: {
      maintenanceCostPerProperty: workOrdersByProperty
        .map((row) => ({
          property_id: row.property_id,
          property_name: row.property_name,
          total_cost: row.total_cost,
          work_order_count: row.work_order_count,
        }))
        .sort((a, b) => b.total_cost - a.total_cost),
      maintenanceCostPerBuilding: maintenanceCostByBuilding,
      workOrderVolumeByProperty: workOrdersByProperty.map((row) => ({
        property_id: row.property_id,
        property_name: row.property_name,
        work_order_count: row.work_order_count,
        completed_count: row.completed_count,
      })),
      mostExpensiveAssets: maintenanceCostByAsset.slice(0, 10).map((row) => ({
        asset_id: row.asset_id,
        asset_name: row.asset_name,
        total_cost: row.total_cost,
        work_order_count: row.work_order_count,
      })),
      costTrends,
      repairFrequency,
    },
  };
}

export function getReportDataset(
  data: OperationsIntelligenceData,
  type: OperationsReportType
): ReportDataset {
  if (type === "maintenance_cost_by_asset") {
    return {
      title: reportTypeTitle(type),
      columns: [
        { key: "asset_name", label: "Asset" },
        { key: "property_name", label: "Property" },
        { key: "building_name", label: "Building" },
        { key: "work_order_count", label: "Work Orders" },
        { key: "parts_cost", label: "Parts Cost" },
        { key: "labor_cost", label: "Labor Cost" },
        { key: "vendor_cost", label: "Vendor Cost" },
        { key: "total_cost", label: "Total Cost" },
      ],
      rows: data.reports.maintenanceCostByAsset,
    };
  }
  if (type === "maintenance_cost_by_building") {
    return {
      title: reportTypeTitle(type),
      columns: [
        { key: "building_name", label: "Building" },
        { key: "property_name", label: "Property" },
        { key: "work_order_count", label: "Work Orders" },
        { key: "total_cost", label: "Total Cost" },
      ],
      rows: data.reports.maintenanceCostByBuilding,
    };
  }
  if (type === "work_orders_by_technician") {
    return {
      title: reportTypeTitle(type),
      columns: [
        { key: "technician_name", label: "Technician" },
        { key: "work_order_count", label: "Work Orders" },
        { key: "completed_count", label: "Completed" },
      ],
      rows: data.reports.workOrdersByTechnician,
    };
  }
  if (type === "work_orders_by_property") {
    return {
      title: reportTypeTitle(type),
      columns: [
        { key: "property_name", label: "Property" },
        { key: "work_order_count", label: "Work Orders" },
        { key: "completed_count", label: "Completed" },
        { key: "total_cost", label: "Total Cost" },
      ],
      rows: data.reports.workOrdersByProperty,
    };
  }
  return {
    title: reportTypeTitle(type),
    columns: [
      { key: "asset_name", label: "Asset" },
      { key: "failure_work_orders", label: "Failure Work Orders" },
      { key: "total_work_orders", label: "Total Work Orders" },
      { key: "failure_rate", label: "Failure Rate (%)" },
    ],
    rows: data.reports.assetFailureRate,
  };
}
