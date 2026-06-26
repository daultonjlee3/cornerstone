import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";
import { loadProfitabilityContext } from "@/src/lib/operational-profitability/queries";
import { computeTruckDayProfitability } from "@/src/lib/operational-profitability/mart-profitability";

const DEFAULT_TRUCK_HOURS_PER_DAY = 10;
const DEFAULT_EVENT_INTERVAL_HOURS = 5 / 60; // 5-minute poll interval

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function eachDateInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(toDateOnlyString(d));
  }
  return dates;
}

function jobHoursOnDate(
  scheduledStart: string | null,
  scheduledEnd: string | null
): number {
  if (!scheduledStart || !scheduledEnd) return 2;
  const start = Date.parse(scheduledStart);
  const end = Date.parse(scheduledEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 2;
  return Math.min(24, (end - start) / (1000 * 60 * 60));
}

function jobOverlapsDate(
  scheduledStart: string | null,
  scheduledEnd: string | null,
  date: string
): boolean {
  if (!scheduledStart) return false;
  const dayStart = Date.parse(`${date}T00:00:00.000Z`);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const start = Date.parse(scheduledStart);
  const end = scheduledEnd ? Date.parse(scheduledEnd) : start + 2 * 60 * 60 * 1000;
  return start < dayEnd && end > dayStart;
}

function truckDailyCapacityHours(capacity: Record<string, unknown> | null | undefined): number {
  const hours = capacity?.daily_hours;
  if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) return hours;
  return DEFAULT_TRUCK_HOURS_PER_DAY;
}

type TruckRow = {
  id: string;
  branch_id: string;
  tenant_id: string;
  status: string;
  truck_type: string;
  home_latitude: number | null;
  home_longitude: number | null;
  capacity: Record<string, unknown>;
};

function weekStartForDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

type TelematicsRow = {
  recorded_at: string;
  idle: boolean | null;
  engine_on: boolean | null;
  odometer_miles: number | null;
  latitude: number;
  longitude: number;
};

type JobRow = {
  id: string;
  branch_id: string;
  assigned_truck_id: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  revenue_estimate: number;
  customer_sites: { latitude: number | null; longitude: number | null } | null;
};

export type RefreshUtilizationResult = {
  tenantId: string;
  from: string;
  to: string;
  trucksProcessed: number;
  daysProcessed: number;
  utilizationRowsUpserted: number;
  capacityRowsUpserted: number;
};

export async function refreshUtilizationDailyForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<RefreshUtilizationResult> {
  const dates = eachDateInRange(fromDate, toDate);

  const profitabilityCtx = await loadProfitabilityContext(supabase, tenantId);

  const { data: trucks, error: trucksError } = await supabase
    .from("trucks")
    .select("id, branch_id, tenant_id, status, truck_type, home_latitude, home_longitude, capacity")
    .eq("tenant_id", tenantId)
    .neq("status", "retired");

  if (trucksError) throw new Error(trucksError.message);
  const truckRows = (trucks ?? []) as TruckRow[];

  const { data: jobs, error: jobsError } = await supabase
    .from("fleet_jobs")
    .select(
      "id, branch_id, assigned_truck_id, status, scheduled_start, scheduled_end, revenue_estimate, customer_sites(latitude, longitude)"
    )
    .eq("tenant_id", tenantId)
    .gte("scheduled_start", `${fromDate}T00:00:00.000Z`)
    .lte("scheduled_start", `${toDate}T23:59:59.999Z`);

  if (jobsError) throw new Error(jobsError.message);
  const jobRows = (jobs ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const site = r.customer_sites;
    const siteObj = Array.isArray(site) ? site[0] : site;
    return {
      ...(r as unknown as JobRow),
      customer_sites: siteObj as JobRow["customer_sites"],
    };
  });

  const dayStartIso = `${fromDate}T00:00:00.000Z`;
  const dayEndIso = `${toDate}T23:59:59.999Z`;

  const { data: events, error: eventsError } = await supabase
    .from("telematics_events")
    .select("truck_id, recorded_at, idle, engine_on, odometer_miles, latitude, longitude")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", dayStartIso)
    .lte("recorded_at", dayEndIso)
    .order("recorded_at", { ascending: true });

  if (eventsError) throw new Error(eventsError.message);

  const eventsByTruckDate = new Map<string, TelematicsRow[]>();
  for (const event of events ?? []) {
    const row = event as TelematicsRow & { truck_id: string };
    const date = row.recorded_at.slice(0, 10);
    const key = `${row.truck_id}:${date}`;
    const list = eventsByTruckDate.get(key) ?? [];
    list.push(row);
    eventsByTruckDate.set(key, list);
  }

  let utilizationRowsUpserted = 0;
  const branchCommittedByDate = new Map<string, number>();
  const branchAvailableByDate = new Map<string, number>();
  const weeklyCommittedByTruck = new Map<string, number>();
  let currentWeekStart: string | null = null;

  for (const date of dates) {
    const weekStart = weekStartForDate(date);
    if (currentWeekStart !== weekStart) {
      weeklyCommittedByTruck.clear();
      currentWeekStart = weekStart;
    }

    for (const truck of truckRows) {
      const dailyCapacity = truckDailyCapacityHours(truck.capacity);
      const eventKey = `${truck.id}:${date}`;
      const truckEvents = eventsByTruckDate.get(eventKey) ?? [];

      let idleHours = 0;
      let totalHours = 0;
      let miles = 0;
      let lastPosition = {
        latitude: truck.home_latitude,
        longitude: truck.home_longitude,
      };

      if (truckEvents.length > 0) {
        const idleEvents = truckEvents.filter((e) => e.idle === true).length;
        idleHours = Math.round(idleEvents * DEFAULT_EVENT_INTERVAL_HOURS * 100) / 100;

        const first = truckEvents[0];
        const last = truckEvents[truckEvents.length - 1];
        const spanMs = Date.parse(last.recorded_at) - Date.parse(first.recorded_at);
        totalHours = Math.round(Math.min(24, Math.max(spanMs / (1000 * 60 * 60), idleHours)) * 100) / 100;

        const firstOdo = first.odometer_miles;
        const lastOdo = last.odometer_miles;
        if (firstOdo != null && lastOdo != null && lastOdo >= firstOdo) {
          miles = Math.round((lastOdo - firstOdo) * 100) / 100;
        }

        lastPosition = { latitude: last.latitude, longitude: last.longitude };
      }

      const truckJobs = jobRows.filter(
        (job) =>
          job.assigned_truck_id === truck.id &&
          jobOverlapsDate(job.scheduled_start, job.scheduled_end, date)
      );

      let revenue = 0;
      let committedHours = 0;
      let billableHours = 0;
      let deadheadMiles = 0;

      for (const job of truckJobs) {
        const hours = jobHoursOnDate(job.scheduled_start, job.scheduled_end);
        committedHours += hours;
        if (job.status === "completed" || job.status === "in_progress") {
          billableHours += hours;
          revenue += Number(job.revenue_estimate) || 0;
        } else if (job.status === "scheduled") {
          billableHours += hours * 0.5;
        }

        const site = job.customer_sites;
        const deadhead = estimateDeadheadMiles(lastPosition, {
          latitude: site?.latitude ?? null,
          longitude: site?.longitude ?? null,
        });
        if (deadhead) deadheadMiles += deadhead.miles;
      }

      committedHours = Math.round(committedHours * 100) / 100;
      billableHours = Math.round(billableHours * 100) / 100;
      revenue = Math.round(revenue * 100) / 100;
      deadheadMiles = Math.round(deadheadMiles * 100) / 100;

      // Keep total_hours >= billable so utilization never exceeds 100% from sparse telematics
      totalHours = Math.round(
        Math.min(24, Math.max(totalHours, billableHours, committedHours, idleHours)) * 100
      ) / 100;

      const weeklyBefore = weeklyCommittedByTruck.get(truck.id) ?? 0;
      const profitability = computeTruckDayProfitability(
        profitabilityCtx,
        truck.id,
        truck.truck_type,
        {
          revenue,
          billableHours,
          committedHours,
          idleHours,
          deadheadMiles,
          miles,
          weeklyCommittedBefore: weeklyBefore,
        }
      );

      weeklyCommittedByTruck.set(truck.id, weeklyBefore + committedHours);

      const { error: upsertError } = await supabase.from("utilization_daily").upsert(
        {
          tenant_id: tenantId,
          truck_id: truck.id,
          branch_id: truck.branch_id,
          date,
          billable_hours: billableHours,
          idle_hours: idleHours,
          total_hours: totalHours,
          miles,
          revenue,
          deadhead_miles: deadheadMiles,
          committed_hours: committedHours,
          labor_cost: profitability.labor_cost,
          fuel_cost: profitability.fuel_cost,
          deadhead_cost: profitability.deadhead_cost,
          idle_cost: profitability.idle_cost,
          variable_cost: profitability.variable_cost,
          contribution: profitability.contribution,
          margin_pct: profitability.margin_pct,
          overtime_cost: profitability.overtime_cost,
          refreshed_at: new Date().toISOString(),
        },
        { onConflict: "truck_id,date" }
      );

      if (upsertError) throw new Error(upsertError.message);
      utilizationRowsUpserted += 1;

      const branchKey = `${truck.branch_id}:${date}`;
      branchCommittedByDate.set(
        branchKey,
        (branchCommittedByDate.get(branchKey) ?? 0) + committedHours
      );
      if (truck.status === "active") {
        branchAvailableByDate.set(
          branchKey,
          (branchAvailableByDate.get(branchKey) ?? 0) + dailyCapacity
        );
      }
    }
  }

  let capacityRowsUpserted = 0;
  for (const [branchKey, available] of branchAvailableByDate) {
    const [branchId, date] = branchKey.split(":");
    const committed = branchCommittedByDate.get(branchKey) ?? 0;

    const { error: capacityError } = await supabase.from("branch_capacity_snapshots").upsert(
      {
        tenant_id: tenantId,
        branch_id: branchId,
        date,
        available_truck_hours: Math.round(available * 100) / 100,
        committed_hours: Math.round(committed * 100) / 100,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: "branch_id,date" }
    );

    if (capacityError) throw new Error(capacityError.message);
    capacityRowsUpserted += 1;
  }

  return {
    tenantId,
    from: fromDate,
    to: toDate,
    trucksProcessed: truckRows.length,
    daysProcessed: dates.length,
    utilizationRowsUpserted,
    capacityRowsUpserted,
  };
}

export async function refreshUtilizationDailyForAllTenants(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<RefreshUtilizationResult[]> {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id")
    .in("product_profile", ["fleet_intelligence", "hybrid"]);

  if (error) throw new Error(error.message);

  const results: RefreshUtilizationResult[] = [];
  for (const tenant of tenants ?? []) {
    const tenantId = (tenant as { id: string }).id;
    results.push(await refreshUtilizationDailyForTenant(supabase, tenantId, fromDate, toDate));
  }
  return results;
}

export function defaultMartRefreshDateRange(): { from: string; to: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return {
    from: toDateOnlyString(yesterday),
    to: toDateOnlyString(today),
  };
}

function normalizeDateOnly(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  if (Number.isNaN(Date.parse(`${dateOnly}T00:00:00.000Z`))) return null;
  return dateOnly;
}

/** Fire-and-forget mart refresh after ingest — errors are logged, not thrown. */
export async function triggerMartRefreshAfterIngest(
  supabase: SupabaseClient,
  tenantId: string,
  dates?: string[]
): Promise<void> {
  try {
    const normalizedDates = (dates ?? [])
      .map((d) => normalizeDateOnly(d))
      .filter((d): d is string => d !== null);
    const uniqueDates = [...new Set(normalizedDates)];
    if (uniqueDates.length > 0) {
      const sortedDates = uniqueDates.sort((a, b) => a.localeCompare(b));
      const from = sortedDates[0];
      const to = sortedDates[sortedDates.length - 1];
      await refreshUtilizationDailyForTenant(supabase, tenantId, from, to);
    } else {
      const { from, to } = defaultMartRefreshDateRange();
      await refreshUtilizationDailyForTenant(supabase, tenantId, from, to);
    }
  } catch (error) {
    console.error("[fleet-marts] post-ingest refresh failed:", error);
  }
}
