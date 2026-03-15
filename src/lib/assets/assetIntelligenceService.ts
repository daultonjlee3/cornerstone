import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { calculateAssetHealth, getAssetHealthBreakdown } from "./assetHealthService";
import { getAssetIntelligenceContext, resolveTenantScope } from "./asset-intelligence-context";
import {
  generateAssetInsights,
  getPortfolioFailurePatterns,
} from "./assetIntelligenceInsightsService";
import type {
  AssetInsightRecord,
  AssetIntelligenceDashboard,
  AssetTimelineEvent,
  AssetTimelineEventType,
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

function toCanonicalType(
  eventType: string,
  source: string,
  status?: string
): AssetTimelineEventType {
  const lower = eventType.toLowerCase();
  if (lower.includes("work_order") || source === "work_order") {
    if (status === "completed" || lower.includes("completed")) return "WORK_ORDER_COMPLETED";
    return "WORK_ORDER_CREATED";
  }
  if (lower.includes("pm_run") || lower.includes("pm run")) {
    if (lower.includes("completed") || lower.includes("executed")) return "PM_COMPLETED";
    return "PM_CREATED";
  }
  if (lower.includes("pm_plan") || lower.includes("pm plan")) return "PM_CREATED";
  if (lower.includes("part") || source === "parts") return "PART_USED";
  if (lower.includes("note") || source === "note") return "NOTE_ADDED";
  if (lower.includes("asset_sub_asset_linked")) return "SUB_ASSET_ADDED";
  if (lower.includes("asset_sub_asset_moved")) return "SUB_ASSET_MOVED";
  if (lower.includes("asset_sub_asset_unlinked")) return "SUB_ASSET_REMOVED";
  if (lower.includes("asset_edited") || lower.includes("asset_updated")) return "ASSET_UPDATED";
  if (lower.includes("asset_created")) return "ASSET_CREATED";
  if (lower.includes("asset_installation")) return "ASSET_INSTALLATION";
  return "ASSET_EVENT";
}

function eventBase(): Pick<AssetTimelineEvent, "subAssetId" | "subAssetName" | "userName"> {
  return { subAssetId: null, subAssetName: null, userName: null };
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

const DEFAULT_TIMELINE_LIMIT = 20;

export type GetAssetTimelineResult = {
  events: AssetTimelineEvent[];
  hasMore: boolean;
};

export async function getAssetTimeline(
  assetId: string,
  options?: { supabase?: SupabaseClient; limit?: number; offset?: number }
): Promise<GetAssetTimelineResult> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const limit = options?.limit ?? DEFAULT_TIMELINE_LIMIT;
  const offset = options?.offset ?? 0;

  const { data: childAssetsRows } = await supabase
    .from("assets")
    .select("id, asset_name, name")
    .eq("parent_asset_id", assetId);
  const childAssets = (childAssetsRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: (r.asset_name as string | null) ?? (r.name as string | null) ?? "Sub-asset",
    };
  });
  const childAssetIds = childAssets.map((c) => c.id);
  const childNameById = new Map(childAssets.map((c) => [c.id, c.name]));
  const assetIdsForTimeline = [assetId, ...childAssetIds];

  const installDate = (asset.install_date as string | null) ?? null;
  const pmPlanRows = await supabase
    .from("preventive_maintenance_plans")
    .select("id, name, created_at, next_run_date, last_run_date")
    .eq("asset_id", assetId);
  const pmPlanIds = (pmPlanRows.data ?? []).map((row) => row.id).filter(Boolean) as string[];

  const workOrderRows = await supabase
    .from("work_orders")
    .select(
      "id, asset_id, work_order_number, title, source_type, category, status, created_at, started_at, completed_at, completion_notes, completed_by_technician_id, technicians!completed_by_technician_id(technician_name, name)"
    )
    .in("asset_id", assetIdsForTimeline)
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
      .select("id, entity_id, action_type, performed_at, metadata, performed_by")
      .eq("entity_type", "asset")
      .in("entity_id", assetIdsForTimeline)
      .order("performed_at", { ascending: false })
      .limit(100),
  ]);
  const performedByIds = [
    ...new Set(
      (assetLogRows.data ?? [])
        .map((row) => (row as { performed_by?: string | null }).performed_by)
        .filter(Boolean) as string[]
    ),
  ];
  const { data: userRows } = performedByIds.length
    ? await supabase.from("users").select("id, full_name").in("id", performedByIds)
    : { data: [] as unknown[] };
  const userNameById = new Map(
    (userRows ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { full_name?: string | null }).full_name ?? "Unknown",
    ])
  );

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
  const woIdsSeen = new Set<string>();

  events.push({
    id: `asset-created-${assetId}`,
    eventAt:
      ((asset.created_at as string | null) ?? (asset.updated_at as string | null) ?? new Date().toISOString()),
    eventType: "asset_created",
    canonicalType: "ASSET_CREATED",
    source: "system",
    summary: "Asset record created.",
    details: null,
    technicianName: null,
    technicianId: null,
    workOrderId: null,
    workOrderNumber: null,
    ...eventBase(),
  });
  if (installDate) {
    events.push({
      id: `asset-install-${assetId}`,
      eventAt: new Date(`${installDate}T12:00:00`).toISOString(),
      eventType: "asset_installation",
      canonicalType: "ASSET_INSTALLATION",
      source: "manual",
      summary: "Asset installation date recorded.",
      details: null,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
      ...eventBase(),
    });
  }

  for (const row of workOrderRows.data ?? []) {
    const workOrder = row as Record<string, unknown>;
    const workOrderId = workOrder.id as string;
    const woAssetId = (workOrder.asset_id as string | null) ?? assetId;
    const isChildAsset = woAssetId !== assetId;
    const subAssetName = isChildAsset ? childNameById.get(woAssetId) ?? null : null;
    const status = String(workOrder.status ?? "updated");
    const completedAt = workOrder.completed_at as string | null;
    const canonicalType = status === "completed" || completedAt ? "WORK_ORDER_COMPLETED" : "WORK_ORDER_CREATED";
    woIdsSeen.add(workOrderId);
    const title = (workOrder.title as string | null) ?? "Work order update";
    const woNum = (workOrder.work_order_number as string | null) ?? workOrderId.slice(0, 8);
    const summary = workOrder.source_type === "preventive_maintenance"
      ? `PM completed: ${title}`
      : `${title}`;
    events.push({
      id: `work-order-${workOrderId}`,
      eventAt:
        completedAt ??
        (workOrder.started_at as string | null) ??
        (workOrder.created_at as string | null) ??
        new Date().toISOString(),
      eventType: `work_order_${status}`,
      canonicalType,
      source: "work_order",
      summary: isChildAsset ? `${summary}` : summary,
      details: (workOrder.completion_notes as string | null) ?? null,
      technicianName: technicianNameById.get(
        (workOrder.completed_by_technician_id as string | null) ?? ""
      ) ?? null,
      technicianId: (workOrder.completed_by_technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber: (workOrder.work_order_number as string | null) ?? null,
      subAssetId: isChildAsset ? woAssetId : null,
      subAssetName,
      userName: null,
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
      eventType: "part_used",
      canonicalType: "PART_USED",
      source: "parts",
      summary: `${(part.part_name_snapshot as string | null) ?? "Part"} used (${Number(
        part.quantity_used ?? 0
      )} ${(part.unit_of_measure as string | null) ?? "units"}).`,
      details: null,
      technicianName: null,
      technicianId: null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
      ...eventBase(),
    });
  }

  for (const row of noteRows.data ?? []) {
    const note = row as Record<string, unknown>;
    const workOrderId = (note.work_order_id as string | null) ?? null;
    const relatedWorkOrder = workOrderId ? workOrderById.get(workOrderId) : null;
    events.push({
      id: `note-${note.id as string}`,
      eventAt: (note.created_at as string | null) ?? new Date().toISOString(),
      eventType: "note_added",
      canonicalType: "NOTE_ADDED",
      source: "note",
      summary: "Note added.",
      details: (note.body as string | null) ?? null,
      technicianName: technicianNameById.get((note.technician_id as string | null) ?? "") ?? null,
      technicianId: (note.technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
      ...eventBase(),
    });
  }

  for (const row of pmPlanRows.data ?? []) {
    const plan = row as Record<string, unknown>;
    events.push({
      id: `pm-plan-${plan.id as string}`,
      eventAt: (plan.created_at as string | null) ?? new Date().toISOString(),
      eventType: "pm_plan_created",
      canonicalType: "PM_CREATED",
      source: "pm",
      summary: `Preventive maintenance plan created: ${(plan.name as string | null) ?? "PM Plan"}.`,
      details: `Next run: ${(plan.next_run_date as string | null) ?? "not scheduled"}`,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
      ...eventBase(),
    });
  }

  for (const row of pmRunRows.data ?? []) {
    const run = row as Record<string, unknown>;
    const generatedWorkOrderId =
      (run.generated_work_order_id as string | null | undefined) ?? null;
    const relatedWorkOrder = generatedWorkOrderId
      ? workOrderById.get(generatedWorkOrderId)
      : null;
    const runStatus = String(run.status ?? "generated");
    events.push({
      id: `pm-run-${run.id as string}`,
      eventAt:
        (run.executed_at as string | null) ??
        (run.scheduled_date
          ? new Date(`${String(run.scheduled_date)}T12:00:00`).toISOString()
          : new Date().toISOString()),
      eventType: `pm_run_${runStatus}`,
      canonicalType: runStatus === "completed" ? "PM_COMPLETED" : "PM_CREATED",
      source: "pm",
      summary: runStatus === "completed" ? "Preventive maintenance completed." : `PM run ${runStatus}.`,
      details: generatedWorkOrderId ? "Linked work order generated." : null,
      technicianName: null,
      technicianId: null,
      workOrderId: generatedWorkOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
      ...eventBase(),
    });
  }

  for (const row of manualEventsRows.data ?? []) {
    const event = row as Record<string, unknown>;
    const workOrderId = (event.work_order_id as string | null) ?? null;
    const relatedWorkOrder = workOrderId ? workOrderById.get(workOrderId) : null;
    const eventType = (event.event_type as string | null) ?? "asset_event";
    events.push({
      id: `manual-${event.id as string}`,
      eventAt: (event.event_at as string | null) ?? new Date().toISOString(),
      eventType: toEventTypeLabel(eventType),
      canonicalType: "ASSET_EVENT",
      source: (event.source as string | null) ?? "manual",
      summary: (event.summary as string | null) ?? "Asset event recorded.",
      details: (event.details as string | null) ?? null,
      technicianName: technicianNameById.get((event.technician_id as string | null) ?? "") ?? null,
      technicianId: (event.technician_id as string | null) ?? null,
      workOrderId,
      workOrderNumber:
        (relatedWorkOrder?.work_order_number as string | null | undefined) ?? null,
      ...eventBase(),
    });
  }

  for (const row of assetLogRows.data ?? []) {
    const log = row as Record<string, unknown>;
    const actionType = (log.action_type as string | null) ?? "asset_update";
    if (
      ![
        "asset_created",
        "asset_edited",
        "asset_health_recalculated",
        "asset_sub_asset_linked",
        "asset_sub_asset_moved",
        "asset_sub_asset_unlinked",
      ].includes(actionType)
    ) {
      continue;
    }
    const metadata = (log.metadata as Record<string, unknown> | null) ?? null;
    const logWorkOrderId = (metadata?.work_order_id as string | undefined) ?? null;
    if (logWorkOrderId && woIdsSeen.has(logWorkOrderId)) continue;
    const performedBy = (log.performed_by as string | null) ?? null;
    const userName = performedBy ? userNameById.get(performedBy) ?? null : null;
    let summary: string;
    if (actionType === "asset_edited") {
      summary = userName ? `Asset details updated by ${userName}` : "Asset details updated.";
    } else if (actionType === "asset_sub_asset_linked") {
      summary = userName ? `Sub-asset added by ${userName}` : "Sub-asset added.";
    } else if (actionType === "asset_sub_asset_moved") {
      summary = userName ? `Sub-asset moved by ${userName}` : "Sub-asset moved.";
    } else if (actionType === "asset_sub_asset_unlinked") {
      summary = userName ? `Sub-asset removed by ${userName}` : "Sub-asset removed.";
    } else {
      summary =
        (metadata?.message as string | undefined) ??
        `Asset ${actionType.replace(/_/g, " ")}.`;
    }
    const entityId = (log.entity_id as string | null) ?? assetId;
    const isChild = entityId !== assetId;
    events.push({
      id: `activity-${log.id as string}`,
      eventAt: (log.performed_at as string | null) ?? new Date().toISOString(),
      eventType: actionType,
      canonicalType:
        actionType === "asset_edited"
          ? "ASSET_UPDATED"
          : actionType === "asset_sub_asset_linked"
            ? "SUB_ASSET_ADDED"
            : actionType === "asset_sub_asset_moved"
              ? "SUB_ASSET_MOVED"
              : actionType === "asset_sub_asset_unlinked"
                ? "SUB_ASSET_REMOVED"
                : "ASSET_EVENT",
      source: "activity_log",
      summary,
      details: (metadata?.recommendation as string | undefined) ?? null,
      technicianName: null,
      technicianId: null,
      workOrderId: null,
      workOrderNumber: null,
      subAssetId: isChild ? entityId : null,
      subAssetName: isChild ? childNameById.get(entityId) ?? null : null,
      userName,
    });
  }

  const sorted = events.sort(
    (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
  );
  const total = sorted.length;
  const eventsPage = sorted.slice(offset, offset + limit);
  return { events: eventsPage, hasMore: total > offset + limit };
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
      const [assetsRows, pmRows, topInsights, failurePatterns] = await Promise.all([
        scopedSupabase
          .from("assets")
          .select(
            "id, company_id, asset_name, name, health_score, failure_risk, maintenance_cost_last_12_months, replacement_cost, expected_life_years, install_date"
          )
          .in("company_id", scopedCompanyIds),
        scopedSupabase
          .from("preventive_maintenance_plans")
          .select("id, next_run_date, status")
          .in("company_id", scopedCompanyIds)
          .eq("status", "active"),
        generateAssetInsights(scope.tenantId, {
          companyIds: scope.companyIds,
          companyId: options?.companyId ?? null,
          limit: 5,
          supabase: scopedSupabase,
        }),
        getPortfolioFailurePatterns(scope.tenantId, {
          companyIds: scope.companyIds,
          companyId: options?.companyId ?? null,
          limit: 8,
          supabase: scopedSupabase,
        }),
      ]);

      const assets = (assetsRows.data ?? []) as Record<string, unknown>[];
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

      const replacementCandidates = [...assets]
        .map((asset) => {
          const maintenanceCostLast12Months =
            Number((asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0) || 0;
          const replacementCost =
            Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null;
          const expectedLifeYears =
            Number((asset.expected_life_years as number | null | undefined) ?? NaN) || null;
          const installDate = (asset.install_date as string | null) ?? null;
          const ageYears =
            installDate != null
              ? (now.getTime() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              : null;
          const maintenancePercentOfReplacement =
            replacementCost && replacementCost > 0
              ? Number(((maintenanceCostLast12Months / replacementCost) * 100).toFixed(1))
              : null;
          const lifePct =
            ageYears != null && expectedLifeYears != null && expectedLifeYears > 0
              ? ageYears / expectedLifeYears
              : null;
          const shouldFlag =
            (maintenancePercentOfReplacement ?? 0) > 30 || (lifePct ?? 0) > 0.85;
          if (!shouldFlag) return null;
          const severity: AssetInsightRecord["severity"] =
            (maintenancePercentOfReplacement ?? 0) > 45 || (lifePct ?? 0) >= 1
              ? "critical"
              : (maintenancePercentOfReplacement ?? 0) > 35 || (lifePct ?? 0) >= 0.95
              ? "high"
              : "medium";
          return {
            id: (asset.id as string) ?? "",
            assetName: ((asset.asset_name as string | undefined) ?? (asset.name as string | undefined) ?? "Asset"),
            healthScore:
              Number((asset.health_score as number | null | undefined) ?? NaN) || null,
            failureRisk:
              Number((asset.failure_risk as number | null | undefined) ?? NaN) || null,
            expectedLifeYears,
            ageYears: ageYears != null ? Number(ageYears.toFixed(1)) : null,
            maintenanceCostLast12Months,
            replacementCost,
            maintenancePercentOfReplacement,
            recommendation:
              "Plan replacement in upcoming capital cycle while reducing failure risk with targeted maintenance.",
            severity,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const severityRank = (value: AssetInsightRecord["severity"]) =>
            value === "critical" ? 4 : value === "high" ? 3 : value === "medium" ? 2 : 1;
          const left = a as NonNullable<typeof a>;
          const right = b as NonNullable<typeof b>;
          const rankDelta = severityRank(right.severity) - severityRank(left.severity);
          if (rankDelta !== 0) return rankDelta;
          return (
            (right.maintenancePercentOfReplacement ?? 0) -
            (left.maintenancePercentOfReplacement ?? 0)
          );
        })
        .slice(0, 8) as AssetIntelligenceDashboard["replacementCandidates"];

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
          replacementCost: Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null,
          maintenancePercentOfReplacement: (() => {
            const replacementCost = Number((asset.replacement_cost as number | null | undefined) ?? NaN);
            if (!Number.isFinite(replacementCost) || replacementCost <= 0) return null;
            const maintenanceCost = Number(
              (asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0
            );
            return Number(((maintenanceCost / replacementCost) * 100).toFixed(1));
          })(),
          recommendation: (() => {
            const replacementCost = Number((asset.replacement_cost as number | null | undefined) ?? NaN);
            const maintenanceCost = Number(
              (asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0
            );
            if (!Number.isFinite(replacementCost) || replacementCost <= 0) {
              return "Add replacement cost to enable replace-vs-repair guidance.";
            }
            const pct = (maintenanceCost / replacementCost) * 100;
            if (pct > 35) return "Escalate replace-vs-repair decision now.";
            if (pct > 30) return "Start replacement planning and budget scoping.";
            if (pct > 20) return "Monitor monthly trend and prepare trigger thresholds.";
            return "Maintenance spend remains in acceptable range.";
          })(),
          severity: (() : AssetInsightRecord["severity"] => {
            const replacementCost = Number((asset.replacement_cost as number | null | undefined) ?? NaN);
            if (!Number.isFinite(replacementCost) || replacementCost <= 0) return "low";
            const maintenanceCost = Number(
              (asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0
            );
            const pct = (maintenanceCost / replacementCost) * 100;
            if (pct > 45) return "critical";
            if (pct > 35) return "high";
            if (pct > 20) return "medium";
            return "low";
          })(),
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
        topInsights,
        failurePatterns,
        replacementCandidates,
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

export function revalidateAssetIntelligenceCaches(options?: {
  assetId?: string | null;
  companyId?: string | null;
}) {
  revalidateTag("asset-intelligence-dashboard", "max");
  revalidateTag("asset-intelligence-insights", "max");
  revalidateTag("asset-intelligence-failure-patterns", "max");
  if (options?.assetId) {
    revalidateTag(`asset-health-${options.assetId}`, "max");
  }
  if (options?.companyId) {
    revalidateTag(`asset-intelligence-company-${options.companyId}`, "max");
  }
}

export async function getAssetIntelligenceSnapshot(
  assetId: string,
  options?: { supabase?: SupabaseClient }
) {
  const [health, insights, timelineResult] = await Promise.all([
    getAssetHealthBreakdown(assetId),
    getAssetInsights(assetId, options),
    getAssetTimeline(assetId, { ...options, limit: DEFAULT_TIMELINE_LIMIT }),
  ]);
  return { health, insights, timeline: timelineResult.events };
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

  revalidateAssetIntelligenceCaches({
    companyId:
      options?.companyId && scopedCompanyIds.includes(options.companyId)
        ? options.companyId
        : null,
  });
  return { processed: staleAssets.length - errors.length, errors };
}
