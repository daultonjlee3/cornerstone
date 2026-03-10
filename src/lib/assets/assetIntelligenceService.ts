import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { calculateAssetHealth, getAssetHealthBreakdown } from "./assetHealthService";
import { getAssetIntelligenceContext, resolveTenantScope } from "./asset-intelligence-context";
import type {
  AssetInsightRecord,
  AssetIntelligenceDashboard,
  AssetTimelineEvent,
  HealthCategory,
} from "./intelligence-types";

function toHealthCategory(score: number | null): HealthCategory {
  const safeScore = Number(score ?? 0);
  if (safeScore >= 90) return "excellent";
  if (safeScore >= 70) return "good";
  if (safeScore >= 50) return "warning";
  if (safeScore >= 30) return "poor";
  return "critical";
}

function toEventTypeLabel(eventType: string): string {
  if (eventType === "health_calculation") return "Health Update";
  if (eventType.startsWith("work_order")) return "Work Order";
  if (eventType.startsWith("pm_")) return "PM";
  if (eventType.includes("inspection")) return "Inspection";
  return eventType.replace(/_/g, " ");
}

export async function getAssetInsights(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetInsightRecord[]> {
  const { supabase } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const { data } = await supabase
    .from("asset_insights")
    .select("*")
    .eq("asset_id", assetId)
    .eq("is_active", true)
    .order("detected_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    asset_id: row.asset_id as string,
    pattern_type: row.pattern_type as string,
    frequency: Number(row.frequency ?? 0),
    recommendation: (row.recommendation as string) ?? "",
    severity: (row.severity as AssetInsightRecord["severity"]) ?? "medium",
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    detected_at: (row.detected_at as string) ?? new Date().toISOString(),
    last_seen_at: (row.last_seen_at as string) ?? new Date().toISOString(),
    is_active: Boolean(row.is_active),
  }));
}

export async function getAssetTimeline(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetTimelineEvent[]> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);

  const installDate = (asset.install_date as string | null) ?? null;
  const pmPlanRows = await supabase
    .from("preventive_maintenance_plans")
    .select("id, name, created_at, next_run_date, last_run_date")
    .eq("asset_id", assetId);
  const pmPlanIds = (pmPlanRows.data ?? []).map((row) => row.id).filter(Boolean) as string[];

  const workOrderRows = await supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, source_type, category, status, created_at, started_at, completed_at, completion_notes, completed_by_technician_id, technicians!completed_by_technician_id(technician_name, name)"
    )
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(120);
  const workOrderIds = (workOrderRows.data ?? []).map(
    (row) => (row as { id?: string }).id
  ).filter(Boolean) as string[];

  const [partRows, noteRows, manualEventsRows, pmRunRows, assetLogRows] = await Promise.all([
    workOrderIds.length
      ? supabase
          .from("work_order_part_usage")
          .select(
            "id, work_order_id, part_name_snapshot, quantity_used, unit_of_measure, used_at, created_at"
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as unknown[] }),
    workOrderIds.length
      ? supabase
          .from("work_order_notes")
          .select("id, work_order_id, body, created_at, technician_id")
          .in("work_order_id", workOrderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("asset_timeline_events")
      .select(
        "id, event_type, source, summary, details, event_at, technician_id, work_order_id, metadata"
      )
      .eq("asset_id", assetId)
      .order("event_at", { ascending: false })
      .limit(120),
    pmPlanIds.length
      ? supabase
          .from("preventive_maintenance_runs")
          .select(
            "id, preventive_maintenance_plan_id, status, scheduled_date, executed_at, generated_work_order_id"
          )
          .in("preventive_maintenance_plan_id", pmPlanIds)
          .order("scheduled_date", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("activity_logs")
      .select("id, action_type, performed_at, metadata, performed_by")
      .eq("entity_type", "asset")
      .eq("entity_id", assetId)
      .order("performed_at", { ascending: false })
      .limit(80),
  ]);

  const workOrderById = new Map(
    (workOrderRows.data ?? []).map((row) => [row.id as string, row as Record<string, unknown>])
  );
  const technicianNameById = new Map<string, string>();
  for (const row of workOrderRows.data ?? []) {
    const typed = row as Record<string, unknown>;
    const tech = Array.isArray(typed.technicians) ? typed.technicians[0] : typed.technicians;
    const techId = (typed.completed_by_technician_id as string | null) ?? null;
    if (!techId || !tech || typeof tech !== "object") continue;
    const name =
      ((tech as { technician_name?: string | null }).technician_name ??
        (tech as { name?: string | null }).name ??
        null) || null;
    if (name) technicianNameById.set(techId, name);
  }

  const events: AssetTimelineEvent[] = [];
  events.push({
    id: `asset-created-${assetId}`,
    eventAt:
      ((asset.created_at as string | null) ?? (asset.updated_at as string | null) ?? new Date().toISOString()),
    eventType: "asset_created",
    source: "system",
    summary: "Asset record created.",
    details: null,
    technicianName: null,
    technicianId: null,
    workOrderId: null,
    workOrderNumber: null,
  });
  if (installDate) {
    events.push({
      id: `asset-install-${assetId}`,
      eventAt: new Date(`${installDate}T12:00:00`).toISOString(),
      eventType: "asset_installation",
      source: "manual",
      summary: "Asset installation date recorded.",
      details: null,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
    });
  }

  for (const row of workOrderRows.data ?? []) {
    const workOrder = row as Record<string, unknown>;
    const workOrderId = workOrder.id as string;
    events.push({
      id: `work-order-${workOrderId}`,
      eventAt:
        (workOrder.completed_at as string | null) ??
        (workOrder.started_at as string | null) ??
        (workOrder.created_at as string | null) ??
        new Date().toISOString(),
      eventType: `work_order_${String(workOrder.status ?? "updated")}`,
      source: "work_order",
      summary: `${workOrder.source_type === "preventive_maintenance" ? "PM" : "Reactive"} work order ${
        (workOrder.work_order_number as string | null) ?? workOrderId.slice(0, 8)
      }: ${(workOrder.title as string | null) ?? "Work order update"}.`,
      details: (workOrder.completion_notes as string | null) ?? null,
      technicianName: technicianNameById.get(
        (workOrder.completed_by_technician_id as string | null) ?? ""
      ) ?? null,
      technicianId: (workOrder.completed_by_technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber: (workOrder.work_order_number as string | null) ?? null,
    });
  }

  for (const row of partRows.data ?? []) {
    const part = row as Record<string, unknown>;
    const workOrderId = (part.work_order_id as string | null) ?? null;
    const relatedWorkOrder = workOrderId ? workOrderById.get(workOrderId) : null;
    events.push({
      id: `part-${part.id as string}`,
      eventAt:
        (part.used_at as string | null) ??
        (part.created_at as string | null) ??
        new Date().toISOString(),
      eventType: "part_replaced",
      source: "parts",
      summary: `${(part.part_name_snapshot as string | null) ?? "Part"} replaced (${Number(
        part.quantity_used ?? 0
      )} ${(part.unit_of_measure as string | null) ?? "units"}).`,
      details: null,
      technicianName: null,
      technicianId: null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
    });
  }

  for (const row of noteRows.data ?? []) {
    const note = row as Record<string, unknown>;
    const workOrderId = (note.work_order_id as string | null) ?? null;
    const relatedWorkOrder = workOrderId ? workOrderById.get(workOrderId) : null;
    events.push({
      id: `note-${note.id as string}`,
      eventAt: (note.created_at as string | null) ?? new Date().toISOString(),
      eventType: "technician_note",
      source: "note",
      summary: "Technician note added.",
      details: (note.body as string | null) ?? null,
      technicianName: technicianNameById.get((note.technician_id as string | null) ?? "") ?? null,
      technicianId: (note.technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
    });
  }

  for (const row of pmPlanRows.data ?? []) {
    const plan = row as Record<string, unknown>;
    events.push({
      id: `pm-plan-${plan.id as string}`,
      eventAt: (plan.created_at as string | null) ?? new Date().toISOString(),
      eventType: "pm_plan_created",
      source: "pm",
      summary: `Preventive maintenance plan created: ${(plan.name as string | null) ?? "PM Plan"}.`,
      details: `Next run: ${(plan.next_run_date as string | null) ?? "not scheduled"}`,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
    });
  }

  for (const row of pmRunRows.data ?? []) {
    const run = row as Record<string, unknown>;
    const generatedWorkOrderId =
      (run.generated_work_order_id as string | null | undefined) ?? null;
    const relatedWorkOrder = generatedWorkOrderId
      ? workOrderById.get(generatedWorkOrderId)
      : null;
    events.push({
      id: `pm-run-${run.id as string}`,
      eventAt:
        (run.executed_at as string | null) ??
        (run.scheduled_date
          ? new Date(`${String(run.scheduled_date)}T12:00:00`).toISOString()
          : new Date().toISOString()),
      eventType: `pm_run_${String(run.status ?? "generated")}`,
      source: "pm",
      summary: `PM run ${String(run.status ?? "generated")} for this asset.`,
      details: generatedWorkOrderId ? "Generated linked work order." : null,
      technicianName: null,
      technicianId: null,
      workOrderId: generatedWorkOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
    });
  }

  for (const row of manualEventsRows.data ?? []) {
    const event = row as Record<string, unknown>;
    const workOrderId = (event.work_order_id as string | null) ?? null;
    const relatedWorkOrder = workOrderId ? workOrderById.get(workOrderId) : null;
    events.push({
      id: `manual-${event.id as string}`,
      eventAt: (event.event_at as string | null) ?? new Date().toISOString(),
      eventType: toEventTypeLabel((event.event_type as string | null) ?? "asset_event"),
      source: (event.source as string | null) ?? "manual",
      summary: (event.summary as string | null) ?? "Asset event recorded.",
      details: (event.details as string | null) ?? null,
      technicianName: technicianNameById.get((event.technician_id as string | null) ?? "") ?? null,
      technicianId: (event.technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
    });
  }

  for (const row of assetLogRows.data ?? []) {
    const log = row as Record<string, unknown>;
    const actionType = (log.action_type as string | null) ?? "asset_update";
    if (!["asset_created", "asset_edited", "asset_health_recalculated"].includes(actionType)) {
      continue;
    }
    events.push({
      id: `activity-${log.id as string}`,
      eventAt: (log.performed_at as string | null) ?? new Date().toISOString(),
      eventType: actionType,
      source: "activity_log",
      summary: `Asset ${actionType.replace(/_/g, " ")}.`,
      details:
        ((log.metadata as Record<string, unknown> | null)?.recommendation as string | undefined) ??
        null,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
    });
  }

  return events.sort(
    (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
  );
}

export async function getAssetIntelligenceDashboard(
  options?: { companyId?: string | null; supabase?: SupabaseClient }
): Promise<AssetIntelligenceDashboard> {
  const scopedSupabase =
    options?.supabase ?? ((await createClient()) as unknown as SupabaseClient);
  const scope = await resolveTenantScope(scopedSupabase);

  const scopedCompanyIds =
    options?.companyId && scope.companyIds.includes(options.companyId)
      ? [options.companyId]
      : scope.companyIds;
  const today = new Date().toISOString().slice(0, 10);

  const loader = unstable_cache(
    async (): Promise<AssetIntelligenceDashboard> => {
      const [assetsRows, insightsRows, pmRows] = await Promise.all([
        scopedSupabase
          .from("assets")
          .select(
            "id, company_id, asset_name, name, health_score, failure_risk, maintenance_cost_last_12_months, replacement_cost, expected_life_years, install_date"
          )
          .in("company_id", scopedCompanyIds),
        scopedSupabase
          .from("asset_insights")
          .select("asset_id, pattern_type, frequency, severity, recommendation, is_active")
          .in("company_id", scopedCompanyIds)
          .eq("is_active", true)
          .order("detected_at", { ascending: false }),
        scopedSupabase
          .from("preventive_maintenance_plans")
          .select("id, next_run_date, status")
          .in("company_id", scopedCompanyIds)
          .eq("status", "active"),
      ]);

      const assets = (assetsRows.data ?? []) as Record<string, unknown>[];
      const insights = (insightsRows.data ?? []) as Record<string, unknown>[];
      const pmPlans = (pmRows.data ?? []) as Record<string, unknown>[];
      const totalAssets = assets.length;

      const healthBuckets: Record<HealthCategory, number> = {
        excellent: 0,
        good: 0,
        warning: 0,
        poor: 0,
        critical: 0,
      };
      let nearingEndOfLife = 0;
      const now = new Date();

      for (const asset of assets) {
        const score = Number((asset.health_score as number | null | undefined) ?? 0);
        healthBuckets[toHealthCategory(Number.isFinite(score) ? score : 0)] += 1;

        const expectedLifeYears =
          Number((asset.expected_life_years as number | null | undefined) ?? NaN) || null;
        const installDate = (asset.install_date as string | null) ?? null;
        if (expectedLifeYears != null && installDate) {
          const age = (now.getTime() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          if (age >= expectedLifeYears * 0.85) nearingEndOfLife += 1;
        }
      }

      const overduePmCount = pmPlans.filter((plan) => {
        const nextRunDate = (plan.next_run_date as string | null) ?? null;
        return Boolean(nextRunDate && nextRunDate < today);
      }).length;
      const pmComplianceRate =
        pmPlans.length === 0 ? 100 : Number((((pmPlans.length - overduePmCount) / pmPlans.length) * 100).toFixed(1));

      const recurringIssues = insights
        .filter((insight) => String(insight.pattern_type ?? "").startsWith("recurring_failure:"))
        .slice(0, 10)
        .map((insight) => {
          const asset = assets.find((item) => item.id === insight.asset_id);
          return {
            assetId: (insight.asset_id as string) ?? "",
            assetName:
              ((asset?.asset_name as string | undefined) ??
                (asset?.name as string | undefined) ??
                "Asset"),
            patternType: (insight.pattern_type as string) ?? "recurring_failure",
            frequency: Number((insight.frequency as number | null | undefined) ?? 0),
            severity: (insight.severity as AssetInsightRecord["severity"]) ?? "medium",
            recommendation: (insight.recommendation as string) ?? "",
          };
        });

      const highFailureRiskAssets = [...assets]
        .sort(
          (a, b) =>
            Number((b.failure_risk as number | null | undefined) ?? 0) -
            Number((a.failure_risk as number | null | undefined) ?? 0)
        )
        .slice(0, 10)
        .map((asset) => ({
          id: (asset.id as string) ?? "",
          assetName: ((asset.asset_name as string | undefined) ?? (asset.name as string | undefined) ?? "Asset"),
          companyId: (asset.company_id as string) ?? "",
          healthScore:
            Number((asset.health_score as number | null | undefined) ?? NaN) || null,
          failureRisk:
            Number((asset.failure_risk as number | null | undefined) ?? NaN) || null,
          maintenanceCostLast12Months:
            Number((asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0) || 0,
        }));

      const maintenanceCostLeaderboard = [...assets]
        .sort(
          (a, b) =>
            Number((b.maintenance_cost_last_12_months as number | null | undefined) ?? 0) -
            Number((a.maintenance_cost_last_12_months as number | null | undefined) ?? 0)
        )
        .slice(0, 10)
        .map((asset) => ({
          id: (asset.id as string) ?? "",
          assetName: ((asset.asset_name as string | undefined) ?? (asset.name as string | undefined) ?? "Asset"),
          maintenanceCostLast12Months:
            Number((asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0) || 0,
          replacementCost:
            Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null,
        }));

      return {
        generatedAt: new Date().toISOString(),
        portfolio: {
          totalAssets,
          pmComplianceRate,
          assetsNearingEndOfLife: nearingEndOfLife,
        },
        healthDistribution: (Object.keys(healthBuckets) as HealthCategory[]).map((category) => ({
          category,
          count: healthBuckets[category],
        })),
        highFailureRiskAssets,
        recurringIssues,
        maintenanceCostLeaderboard,
      };
    },
    [`asset-intelligence-dashboard-${scopedCompanyIds.join(",") || "none"}`],
    {
      revalidate: 300,
      tags: [
        "asset-intelligence-dashboard",
        ...scopedCompanyIds.map((companyId) => `asset-intelligence-company-${companyId}`),
      ],
    }
  );

  return loader();
}

export async function getAssetIntelligenceSnapshot(
  assetId: string,
  options?: { supabase?: SupabaseClient }
) {
  const [health, insights, timeline] = await Promise.all([
    getAssetHealthBreakdown(assetId),
    getAssetInsights(assetId, options),
    getAssetTimeline(assetId, options),
  ]);
  return { health, insights, timeline };
}

export async function recalculateAssetIntelligenceForScope(
  options?: { companyId?: string | null; maxAssets?: number; staleHours?: number }
): Promise<{ processed: number; errors: string[] }> {
  const scopedSupabase = (await createClient()) as unknown as SupabaseClient;
  const scope = await resolveTenantScope(scopedSupabase);
  const scopedCompanyIds =
    options?.companyId && scope.companyIds.includes(options.companyId)
      ? [options.companyId]
      : scope.companyIds;
  const staleHours = options?.staleHours ?? 12;
  const staleCutoff = new Date();
  staleCutoff.setHours(staleCutoff.getHours() - staleHours);

  const { data: assets } = await scopedSupabase
    .from("assets")
    .select("id, last_health_calculation")
    .in("company_id", scopedCompanyIds)
    .order("last_health_calculation", { ascending: true, nullsFirst: true })
    .limit(options?.maxAssets ?? 200);

  const staleAssets = (assets ?? []).filter((asset) => {
    const lastCalc = (asset as { last_health_calculation?: string | null }).last_health_calculation;
    return !lastCalc || new Date(lastCalc) < staleCutoff;
  });

  const errors: string[] = [];
  for (const asset of staleAssets) {
    try {
      await calculateAssetHealth((asset as { id: string }).id);
    } catch (error) {
      errors.push(
        `${(asset as { id: string }).id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { processed: staleAssets.length - errors.length, errors };
}
