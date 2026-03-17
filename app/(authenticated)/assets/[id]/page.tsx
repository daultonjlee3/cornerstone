import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { AssetHealthIndicator } from "../components/asset-health-indicator";
import { AssetIntelligencePanel } from "../components/asset-intelligence-panel";
import { AssetTimeline } from "../components/asset-timeline";
import { AssetDetailHelperTip } from "../components/asset-detail-helper-tip";
import { getAssetIntelligenceSnapshot } from "@/src/lib/assets/assetIntelligenceService";
import { resolveAssetLocation } from "@/src/lib/assets/hierarchy";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { formatDate, formatDateTime } from "@/src/lib/date-utils";

export const metadata = {
  title: "Asset | Cornerstone Tech",
  description: "Asset detail and preventive maintenance",
};

export default async function AssetDetailPage({
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

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: assetRaw, error } = await supabase
    .from("assets")
    .select(
      "id, tenant_id, company_id, parent_asset_id, property_id, building_id, unit_id, asset_name, name, asset_type, category, manufacturer, model, serial_number, status, condition, install_date, expected_life_years, replacement_cost, maintenance_cost_last_12_months, health_score, failure_risk, last_health_calculation, warranty_expires, description, location_notes, notes, last_serviced_at, image_url, companies(name), properties(property_name, name), buildings(building_name, name), units(unit_name, name_or_number)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !assetRaw) notFound();
  if ((assetRaw as { tenant_id: string }).tenant_id !== tenantId) notFound();

  const row = assetRaw as Record<string, unknown>;
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const unit = Array.isArray(row.units) ? row.units[0] : row.units;

  const asset = {
    id: row.id as string,
    company_id: row.company_id as string,
    parent_asset_id: (row.parent_asset_id as string | null) ?? null,
    property_id: (row.property_id as string | null) ?? null,
    building_id: (row.building_id as string | null) ?? null,
    unit_id: (row.unit_id as string | null) ?? null,
    name:
      (row.asset_name as string | null) ??
      (row.name as string | null) ??
      (row.id as string),
    asset_type: (row.asset_type as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    manufacturer: (row.manufacturer as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    serial_number: (row.serial_number as string | null) ?? null,
    status: (row.status as string | null) ?? "active",
    condition: (row.condition as string | null) ?? null,
    install_date: (row.install_date as string | null) ?? null,
    expected_life_years: (row.expected_life_years as number | null) ?? null,
    replacement_cost: (row.replacement_cost as number | null) ?? null,
    maintenance_cost_last_12_months:
      (row.maintenance_cost_last_12_months as number | null) ?? null,
    health_score: (row.health_score as number | null) ?? null,
    failure_risk: (row.failure_risk as number | null) ?? null,
    last_health_calculation: (row.last_health_calculation as string | null) ?? null,
    warranty_expires: (row.warranty_expires as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    location_notes: (row.location_notes as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    last_serviced_at: (row.last_serviced_at as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    company_name:
      company && typeof company === "object"
        ? ((company as { name?: string }).name ?? null)
        : null,
    property_name:
      property && typeof property === "object"
        ? ((property as { property_name?: string }).property_name ??
          (property as { name?: string }).name ??
          null)
        : null,
    building_name:
      building && typeof building === "object"
        ? ((building as { building_name?: string }).building_name ??
          (building as { name?: string }).name ??
          null)
        : null,
    unit_name:
      unit && typeof unit === "object"
        ? ((unit as { unit_name?: string }).unit_name ??
          (unit as { name_or_number?: string }).name_or_number ??
          null)
        : null,
  };
  const resolvedLocation = await resolveAssetLocation(supabase, id);
  const effectivePropertyId = resolvedLocation?.effectivePropertyId ?? asset.property_id;
  const effectiveBuildingId = resolvedLocation?.effectiveBuildingId ?? asset.building_id;
  const effectiveUnitId = resolvedLocation?.effectiveUnitId ?? asset.unit_id;
  const [fallbackProperty, fallbackBuilding, fallbackUnit] = await Promise.all([
    effectivePropertyId && effectivePropertyId !== asset.property_id
      ? supabase
          .from("properties")
          .select("property_name, name")
          .eq("id", effectivePropertyId)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    effectiveBuildingId && effectiveBuildingId !== asset.building_id
      ? supabase
          .from("buildings")
          .select("building_name, name")
          .eq("id", effectiveBuildingId)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    effectiveUnitId && effectiveUnitId !== asset.unit_id
      ? supabase
          .from("units")
          .select("unit_name, name_or_number")
          .eq("id", effectiveUnitId)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
  ]);
  const effectivePropertyName =
    asset.property_name ??
    ((fallbackProperty.data as { property_name?: string; name?: string } | null)?.property_name ??
      (fallbackProperty.data as { property_name?: string; name?: string } | null)?.name ??
      null);
  const effectiveBuildingName =
    asset.building_name ??
    ((fallbackBuilding.data as { building_name?: string; name?: string } | null)?.building_name ??
      (fallbackBuilding.data as { building_name?: string; name?: string } | null)?.name ??
      null);
  const effectiveUnitName =
    asset.unit_name ??
    ((fallbackUnit.data as { unit_name?: string; name_or_number?: string } | null)?.unit_name ??
      (fallbackUnit.data as { unit_name?: string; name_or_number?: string } | null)?.name_or_number ??
      null);
  const locationIsInherited =
    Boolean(resolvedLocation?.inheritedFromParent) &&
    (!asset.property_id || !asset.building_id || !asset.unit_id);

  const parentAssetId = asset.parent_asset_id;
  const { data: parentAssetRaw } = parentAssetId
    ? await supabase
        .from("assets")
        .select("id, asset_name, name, asset_type, category, status")
        .eq("id", parentAssetId)
        .maybeSingle()
    : { data: null as Record<string, unknown> | null };
  const parentAsset = parentAssetRaw
    ? ({
        id: (parentAssetRaw as { id: string }).id,
        name:
          (parentAssetRaw as { asset_name?: string | null }).asset_name ??
          (parentAssetRaw as { name?: string | null }).name ??
          (parentAssetRaw as { id: string }).id,
        type:
          (parentAssetRaw as { asset_type?: string | null }).asset_type ??
          (parentAssetRaw as { category?: string | null }).category ??
          null,
        status: (parentAssetRaw as { status?: string | null }).status ?? "active",
      })
    : null;

  const { data: childAssetsRaw } = await supabase
    .from("assets")
    .select("id, asset_name, name, asset_type, category, status, serial_number")
    .eq("parent_asset_id", id)
    .order("asset_name", { ascending: true, nullsFirst: false })
    .order("name");
  const childAssets = (childAssetsRaw ?? []).map((childRow) => {
    const child = childRow as Record<string, unknown>;
    return {
      id: child.id as string,
      name:
        (child.asset_name as string | null) ??
        (child.name as string | null) ??
        (child.id as string),
      type: (child.asset_type as string | null) ?? (child.category as string | null) ?? null,
      status: (child.status as string | null) ?? "active",
      serial_number: (child.serial_number as string | null) ?? null,
    };
  });
  const childAssetIds = childAssets.map((child) => child.id);
  const childAssetNameById = new Map(childAssets.map((child) => [child.id, child.name]));
  const activeChildCount = childAssets.filter((child) => child.status === "active").length;
  const { data: recentChildWorkOrdersRaw } = childAssetIds.length
    ? await supabase
        .from("work_orders")
        .select("id, asset_id, work_order_number, title, status, priority, created_at, category")
        .in("asset_id", childAssetIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] as unknown[] };
  const recentChildWorkOrders = (recentChildWorkOrdersRaw ?? []).map((row) => {
    const wo = row as Record<string, unknown>;
    const childAssetId = (wo.asset_id as string | null) ?? null;
    return {
      id: wo.id as string,
      assetName: childAssetId ? childAssetNameById.get(childAssetId) ?? "Sub-asset" : "Sub-asset",
      workOrderNumber: (wo.work_order_number as string | null) ?? null,
      title: (wo.title as string | null) ?? "Work order",
      status: (wo.status as string | null) ?? "new",
      priority: (wo.priority as string | null) ?? null,
      createdAt: (wo.created_at as string | null) ?? null,
    };
  });
  const childIssueCutoff = new Date();
  childIssueCutoff.setDate(childIssueCutoff.getDate() - 30);
  const { count: recentChildIssueCount } = childAssetIds.length
    ? await supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .in("asset_id", childAssetIds)
        .gte("created_at", childIssueCutoff.toISOString())
        .in("category", ["repair", "emergency"])
    : { count: 0 };

  const { data: plansRaw } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, name, frequency_type, frequency_interval, next_run_date, status")
    .eq("asset_id", id)
    .order("next_run_date", { ascending: true });

  const plans = (plansRaw ?? []).map((plan) => ({
    id: (plan as { id: string }).id,
    name: (plan as { name: string }).name,
    frequency_type: (plan as { frequency_type: string }).frequency_type,
    frequency_interval: Number((plan as { frequency_interval?: number }).frequency_interval ?? 1),
    next_run_date: (plan as { next_run_date?: string | null }).next_run_date ?? null,
    status: (plan as { status: string }).status,
  }));

  const nextPmDue =
    plans.find((plan) => plan.status === "active" && plan.next_run_date)?.next_run_date ??
    null;

  const { data: serviceRaw } = await supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, source_type, preventive_maintenance_plan_id, completion_notes, completed_at, completed_by_technician_id, assigned_crew_id, technicians!completed_by_technician_id(technician_name, name), crews!assigned_crew_id(name)"
    )
    .eq("asset_id", id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(50);

  const pmPlanIds = Array.from(
    new Set(
      (serviceRaw ?? [])
        .map(
          (row) =>
            (row as { preventive_maintenance_plan_id?: string | null })
              .preventive_maintenance_plan_id
        )
        .filter(Boolean) as string[]
    )
  );
  const { data: pmPlanRows } = pmPlanIds.length
    ? await supabase
        .from("preventive_maintenance_plans")
        .select("id, name")
        .in("id", pmPlanIds)
    : { data: [] as unknown[] };
  const pmPlanById = new Map(
    (pmPlanRows ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { name: string }).name,
    ])
  );

  const serviceHistory = (serviceRaw ?? []).map((row) => {
    const serviceRow = row as Record<string, unknown>;
    const completedTech = Array.isArray(serviceRow.technicians)
      ? serviceRow.technicians[0]
      : serviceRow.technicians;
    const assignedCrew = Array.isArray(serviceRow.crews)
      ? serviceRow.crews[0]
      : serviceRow.crews;
    const completedBy =
      completedTech && typeof completedTech === "object"
        ? ((completedTech as { technician_name?: string }).technician_name ??
          (completedTech as { name?: string }).name ??
          null)
        : null;
    const crewName =
      assignedCrew && typeof assignedCrew === "object"
        ? ((assignedCrew as { name?: string }).name ?? null)
        : null;
    const pmPlanId =
      (serviceRow.preventive_maintenance_plan_id as string | null) ?? null;
    return {
      id: serviceRow.id as string,
      work_order_number: (serviceRow.work_order_number as string | null) ?? null,
      title: (serviceRow.title as string) ?? "Work order",
      completed_at: (serviceRow.completed_at as string | null) ?? null,
      source_type: (serviceRow.source_type as string | null) ?? null,
      preventive_maintenance_plan_id: pmPlanId,
      preventive_maintenance_plan_name: pmPlanId ? pmPlanById.get(pmPlanId) ?? null : null,
      completion_notes: (serviceRow.completion_notes as string | null) ?? null,
      completed_by: completedBy,
      crew_name: crewName,
    };
  });
  const completedWorkOrderIds = serviceHistory.map((entry) => entry.id);
  const { data: attachmentRows } = completedWorkOrderIds.length
    ? await supabase
        .from("work_order_attachments")
        .select("id, work_order_id, file_name, file_url, file_type")
        .in("work_order_id", completedWorkOrderIds)
        .order("created_at", { ascending: false })
    : { data: [] as unknown[] };
  const photoAttachmentsByWorkOrderId = new Map<
    string,
    { id: string; file_name: string; file_url: string }[]
  >();
  (attachmentRows ?? []).forEach((row) => {
    const typed = row as {
      id?: string;
      work_order_id?: string;
      file_name?: string | null;
      file_url?: string | null;
      file_type?: string | null;
    };
    if (!typed.work_order_id || !typed.file_url) return;
    if (!String(typed.file_type ?? "").startsWith("image/")) return;
    const list = photoAttachmentsByWorkOrderId.get(typed.work_order_id) ?? [];
    list.push({
      id: typed.id ?? typed.work_order_id,
      file_name: typed.file_name ?? "Photo",
      file_url: typed.file_url,
    });
    photoAttachmentsByWorkOrderId.set(typed.work_order_id, list);
  });
  const serviceHistoryWithPhotos = serviceHistory.map((entry) => {
    const photos = photoAttachmentsByWorkOrderId.get(entry.id) ?? [];
    return {
      ...entry,
      photo_count: photos.length,
      first_photo_url: photos[0]?.file_url ?? null,
    };
  });
  const lastServicedAt =
    asset.last_serviced_at ?? serviceHistoryWithPhotos[0]?.completed_at ?? null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: recentFailureCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", id)
    .eq("status", "completed")
    .gte("completed_at", thirtyDaysAgo.toISOString())
    .in("category", ["repair", "emergency"]);
  const today = new Date().toISOString().slice(0, 10);
  const staleServiceCutoff = new Date();
  staleServiceCutoff.setMonth(staleServiceCutoff.getMonth() - 6);
  const hasOverduePm = plans.some(
    (plan) =>
      plan.status === "active" &&
      Boolean(plan.next_run_date) &&
      String(plan.next_run_date) < today
  );
  const isStaleService = !lastServicedAt || new Date(lastServicedAt) < staleServiceCutoff;
  const healthWarnings: string[] = [];
  if ((recentFailureCount ?? 0) >= 2) {
    healthWarnings.push(`${recentFailureCount} completed failures in the last 30 days`);
  }
  if (hasOverduePm) {
    healthWarnings.push("Preventive maintenance is overdue");
  }
  if (isStaleService) {
    healthWarnings.push("Asset has not been serviced in 6+ months");
  }

  const intelligence = await getAssetIntelligenceSnapshot(id);
  const workOrderNumberById = new Map(
    serviceHistoryWithPhotos.map((entry) => [entry.id, entry.work_order_number ?? entry.title])
  );
  const { data: partHistoryRows } = serviceHistoryWithPhotos.length
    ? await supabase
        .from("work_order_part_usage")
        .select(
          "id, work_order_id, part_name_snapshot, quantity_used, unit_of_measure, total_cost, used_at, created_at"
        )
        .in(
          "work_order_id",
          serviceHistoryWithPhotos.map((entry) => entry.id)
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as unknown[] };
  const partsHistory = (partHistoryRows ?? []).map((row) => {
    const item = row as Record<string, unknown>;
    const workOrderId = (item.work_order_id as string | null) ?? null;
    return {
      id: item.id as string,
      work_order_id: workOrderId,
      work_order_number: workOrderId ? workOrderNumberById.get(workOrderId) ?? "Work order" : "Work order",
      part_name: (item.part_name_snapshot as string | null) ?? "Part",
      quantity_used: Number(item.quantity_used ?? 0),
      unit_of_measure: (item.unit_of_measure as string | null) ?? null,
      total_cost: Number(item.total_cost ?? 0),
      used_at: (item.used_at as string | null) ?? (item.created_at as string | null) ?? null,
    };
  });
  const upcomingPmCount = plans.filter(
    (plan) => plan.status === "active" && plan.next_run_date && plan.next_run_date >= today
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/assets" className="hover:text-[var(--foreground)]">
          Assets
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{asset.name}</span>
      </div>

      <AssetDetailHelperTip
        repeatedRepairs={(recentFailureCount ?? 0) >= 2}
        noPmPlans={plans.length === 0}
      />

      <header className="ui-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {asset.image_url ? (
            <div className="mb-4 w-full shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]/20 sm:mb-0 sm:mr-4 sm:w-48">
              <img
                src={asset.image_url}
                alt=""
                className="h-36 w-full object-cover object-center"
                sizes="192px"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">{asset.name}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {asset.company_name ?? "—"} •{" "}
              {[effectivePropertyName, effectiveBuildingName, effectiveUnitName]
                .filter(Boolean)
                .join(" / ") || "No linked location"}
              {locationIsInherited ? " (inherited from parent)" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted)]">Next PM due</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {formatDate(nextPmDue)}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">Last serviced</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {formatDateTime(lastServicedAt)}
            </p>
            <Link
              href="/assets/intelligence"
              className="mt-3 inline-flex rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
            >
              Portfolio Intelligence
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Parent Asset
          </h2>
          {parentAsset ? (
            <div className="mt-3 space-y-1">
              <Link href={`/assets/${parentAsset.id}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                {parentAsset.name}
              </Link>
              <p className="text-xs text-[var(--muted)]">
                {[parentAsset.type, parentAsset.status].filter(Boolean).join(" • ")}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              This is a top-level asset.
            </p>
          )}
        </section>
        <section className="ui-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Sub-Assets
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {childAssets.length} total • {activeChildCount} active
            </span>
          </div>
          {childAssets.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No sub-assets linked.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-2 py-2 font-medium text-[var(--foreground)]">Name</th>
                    <th className="px-2 py-2 font-medium text-[var(--foreground)]">Type</th>
                    <th className="px-2 py-2 font-medium text-[var(--foreground)]">Status</th>
                    <th className="px-2 py-2 font-medium text-[var(--foreground)]">Serial</th>
                    <th className="px-2 py-2 font-medium text-[var(--foreground)]">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {childAssets.map((child) => (
                    <tr key={child.id} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="px-2 py-2 text-[var(--foreground)]">{child.name}</td>
                      <td className="px-2 py-2 text-[var(--muted)]">{child.type ?? "—"}</td>
                      <td className="px-2 py-2 text-[var(--muted)]">{child.status}</td>
                      <td className="px-2 py-2 text-[var(--muted)]">{child.serial_number ?? "—"}</td>
                      <td className="px-2 py-2">
                        <Link href={`/assets/${child.id}`} className="text-[var(--accent)] hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AssetHealthIndicator
          score={intelligence.health.healthScore}
          failureRisk={intelligence.health.failureRisk}
          lastCalculatedAt={intelligence.health.lastCalculatedAt}
        />
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Quick Asset Signals
          </h2>
          {healthWarnings.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">
              Asset health is stable based on recent maintenance and PM schedule.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {healthWarnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-[var(--radius-control)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700"
                >
                  {warning}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-[var(--muted)]">
            Maintenance cost (12m): $
            {intelligence.health.maintenanceCostLast12Months.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </section>
      </section>

      <AssetIntelligencePanel
        health={intelligence.health}
        insights={intelligence.insights}
        upcomingPmCount={upcomingPmCount}
      />

      <AssetTimeline key={id} events={intelligence.timeline} assetId={id} />

      {childAssets.length > 0 ? (
        <section className="ui-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Child Asset Rollup
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Recent child issues (30d): {recentChildIssueCount ?? 0}
            </p>
          </div>
          {recentChildWorkOrders.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No recent child work orders.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentChildWorkOrders.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2 text-sm"
                >
                  <Link href={`/work-orders/${entry.id}`} className="font-medium text-[var(--accent)] hover:underline">
                    {entry.workOrderNumber ?? entry.title}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {entry.assetName} • {entry.status}
                    {entry.priority ? ` • ${entry.priority}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Asset details</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Type</dt>
              <dd className="text-[var(--foreground)]">{asset.asset_type ?? asset.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Manufacturer / Model</dt>
              <dd className="text-[var(--foreground)]">
                {[asset.manufacturer, asset.model].filter(Boolean).join(" / ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Serial number</dt>
              <dd className="text-[var(--foreground)]">{asset.serial_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Status / Condition</dt>
              <dd className="text-[var(--foreground)]">
                {[asset.status, asset.condition].filter(Boolean).join(" / ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Install date</dt>
              <dd className="text-[var(--foreground)]">{formatDate(asset.install_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Warranty expires</dt>
              <dd className="text-[var(--foreground)]">{formatDate(asset.warranty_expires)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Expected life</dt>
              <dd className="text-[var(--foreground)]">
                {asset.expected_life_years != null ? `${asset.expected_life_years} years` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Replacement cost</dt>
              <dd className="text-[var(--foreground)]">
                {asset.replacement_cost != null
                  ? `$${asset.replacement_cost.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Description & notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
            {asset.description ?? "No description"}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {asset.location_notes ?? asset.notes ?? "No notes"}
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Preventive Maintenance Plans
          </h2>
          <Link
            href={`/preventive-maintenance?new=1&company_id=${encodeURIComponent(
              asset.company_id
            )}&asset_id=${encodeURIComponent(asset.id)}`}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Create PM Plan
          </Link>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No PM plans linked to this asset yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Plan</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Frequency</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Next run</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-2 py-2 text-[var(--foreground)]">
                      <Link
                        href={`/preventive-maintenance/${plan.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {plan.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      Every {plan.frequency_interval} {plan.frequency_type}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      {formatDate(plan.next_run_date)}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{plan.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Asset Service History
        </h2>
        {serviceHistoryWithPhotos.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No completed work orders for this asset yet.
          </p>
        ) : (
          <DataTable>
            <Table className="min-w-[960px]">
              <TableHead>
                <Th>Date</Th>
                <Th>Work Order</Th>
                <Th>Type</Th>
                <Th>Technician / Crew</Th>
                <Th>Completion Notes</Th>
                <Th>Photos</Th>
              </TableHead>
              <TBody>
                {serviceHistoryWithPhotos.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="text-[var(--muted)]">{formatDateTime(entry.completed_at)}</Td>
                    <Td>
                      <Link href={`/work-orders/${entry.id}`} className="text-[var(--accent)] hover:underline">
                        {entry.work_order_number ?? entry.title}
                      </Link>
                    </Td>
                    <Td className="text-[var(--muted)]">
                      {entry.source_type === "preventive_maintenance" ? (
                        <span>
                          PM
                          {entry.preventive_maintenance_plan_id ? (
                            <>
                              {" "}
                              (
                              <Link
                                href={`/preventive-maintenance/${entry.preventive_maintenance_plan_id}`}
                                className="text-[var(--accent)] hover:underline"
                              >
                                {entry.preventive_maintenance_plan_name ?? "Plan"}
                              </Link>
                              )
                            </>
                          ) : null}
                        </span>
                      ) : (
                        "Reactive"
                      )}
                    </Td>
                    <Td className="text-[var(--muted)]">
                      {[entry.completed_by, entry.crew_name].filter(Boolean).join(" / ") || "—"}
                    </Td>
                    <Td className="text-[var(--muted)]">
                      {entry.completion_notes ?? "—"}
                    </Td>
                    <Td className="text-[var(--muted)]">
                      {entry.photo_count > 0 ? (
                        <a
                          href={entry.first_photo_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] hover:underline"
                        >
                          {entry.photo_count} photo{entry.photo_count === 1 ? "" : "s"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
        )}
      </section>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Parts History</h2>
        {partsHistory.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No parts history linked to completed work orders.</p>
        ) : (
          <DataTable>
            <Table className="min-w-[760px]">
              <TableHead>
                <Th>Date</Th>
                <Th>Part</Th>
                <Th>Quantity</Th>
                <Th>Cost</Th>
                <Th>Work Order</Th>
              </TableHead>
              <TBody>
                {partsHistory.map((part) => (
                  <Tr key={part.id}>
                    <Td className="text-[var(--muted)]">{formatDateTime(part.used_at)}</Td>
                    <Td>{part.part_name}</Td>
                    <Td className="text-[var(--muted)]">
                      {part.quantity_used} {part.unit_of_measure ?? ""}
                    </Td>
                    <Td className="text-[var(--muted)]">
                      ${part.total_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Td>
                    <Td>
                      {part.work_order_id ? (
                        <Link href={`/work-orders/${part.work_order_id}`} className="text-[var(--accent)] hover:underline">
                          {part.work_order_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
        )}
      </section>
    </div>
  );
}
