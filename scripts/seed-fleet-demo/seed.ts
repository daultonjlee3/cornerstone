import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshUtilizationDailyForTenant } from "../../src/lib/fleet/marts/refresh-utilization-daily";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import { buildDemoJobs } from "./build-demo-jobs";
import {
  BRANCHES,
  CUSTOMERS,
  MART_HISTORY_DAYS,
  OPERATOR_FIRST,
  OPERATOR_LAST,
  PEACHTREE_COMPANY,
  PEACHTREE_TENANT,
  SITE_LOCATIONS,
  TOTAL_OPERATORS,
  TOTAL_TRUCKS,
  TRUCK_TYPES,
  type BranchDef,
} from "./constants";
import {
  DEMO_UNIT_PREFIX,
  STAGED_GPS_OFFLINE_UNITS,
  STAGED_GPS_STALE_UNITS,
  STAGED_PM_UNITS,
} from "./scenarios";
import {
  addDays,
  demoBoardDate,
  hoursAgoIso,
  insertBatches,
  intBetween,
  lerp,
  minutesAgoIso,
  mulberry32,
  pick,
  pickWeighted,
  todayDateOnly,
} from "./utils";

export type PeachtreeSeedResult = {
  tenantId: string;
  companyId: string;
  branchIds: Record<string, string>;
  truckCount: number;
  operatorCount: number;
  jobCount: number;
  telematicsCount: number;
  recommendationCount: number;
  demoBoardDate: string;
};

type BranchRecord = { id: string; code: string; def: BranchDef };
type SiteRecord = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  customerName: string;
};
type TruckRecord = {
  id: string;
  branchCode: string;
  branchId: string;
  unitNumber: string;
  truckType: string;
  homeLat: number;
  homeLng: number;
};
type OperatorRecord = { id: string; branchId: string; name: string };

const rng = mulberry32(0x70656163); // "peac"

async function ensureTenantAndCompany(supabase: SupabaseClient): Promise<{
  tenantId: string;
  companyId: string;
}> {
  let { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", PEACHTREE_TENANT.slug)
    .maybeSingle();

  if (!tenant?.id) {
    const { data: created, error } = await supabase
      .from("tenants")
      .insert({
        name: PEACHTREE_TENANT.name,
        slug: PEACHTREE_TENANT.slug,
        product_profile: PEACHTREE_TENANT.productProfile,
      })
      .select("id")
      .single();
    if (error || !created?.id) throw new Error(`Tenant create failed: ${error?.message}`);
    tenant = created;
  } else {
    await supabase
      .from("tenants")
      .update({
        name: PEACHTREE_TENANT.name,
        product_profile: PEACHTREE_TENANT.productProfile,
      })
      .eq("id", tenant.id);
  }

  const tenantId = tenant.id as string;

  let { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const companyPayload = {
    name: PEACHTREE_COMPANY.name,
    tenant_id: tenantId,
    status: "active",
    legal_name: PEACHTREE_COMPANY.legalName,
    company_code: "PEACHTREE",
    primary_contact_name: "Dispatch Center",
    primary_contact_email: "dispatch@peachtreeindustrial.com",
    phone: PEACHTREE_COMPANY.phone,
    website: PEACHTREE_COMPANY.website,
    address: `${PEACHTREE_COMPANY.addressLine1}, ${PEACHTREE_COMPANY.city}, ${PEACHTREE_COMPANY.state} ${PEACHTREE_COMPANY.postalCode}`,
    timezone: "America/New_York",
  };

  if (!company?.id) {
    const { data: created, error } = await supabase
      .from("companies")
      .insert(companyPayload)
      .select("id")
      .single();
    if (error || !created?.id) throw new Error(`Company create failed: ${error?.message}`);
    company = created;
  } else {
    await supabase.from("companies").update(companyPayload).eq("id", company.id);
  }

  return { tenantId, companyId: company.id as string };
}

async function seedBranches(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string
): Promise<BranchRecord[]> {
  const records: BranchRecord[] = [];
  for (const def of BRANCHES) {
    const { data, error } = await supabase
      .from("branches")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        name: def.name,
        code: def.code,
        address_line1: def.address,
        city: def.city,
        state: def.state,
        postal_code: def.postalCode,
        country: "US",
        latitude: def.latitude,
        longitude: def.longitude,
        timezone: def.timezone,
        status: "active",
      })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(`Branch ${def.code} failed: ${error?.message}`);
    records.push({ id: data.id as string, code: def.code, def });
  }
  return records;
}

async function seedCustomersAndSites(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string
): Promise<SiteRecord[]> {
  const sites: SiteRecord[] = [];
  for (let i = 0; i < SITE_LOCATIONS.length; i++) {
    const loc = SITE_LOCATIONS[i];
    const customerName = CUSTOMERS[i % CUSTOMERS.length];

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name: customerName,
        email: `ops+${i}@${customerName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
        phone: `(770) 555-${String(1000 + i).slice(-4)}`,
        address: `${loc.address}, ${loc.city}, GA`,
      })
      .select("id")
      .single();
    if (custErr || !customer?.id) throw new Error(`Customer failed: ${custErr?.message}`);

    const { data: site, error: siteErr } = await supabase
      .from("customer_sites")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        customer_id: customer.id,
        name: loc.name,
        address_line1: loc.address,
        city: loc.city,
        state: "GA",
        country: "US",
        latitude: loc.latitude,
        longitude: loc.longitude,
        external_source_id: `PIS-SITE-${String(i + 1).padStart(3, "0")}`,
      })
      .select("id")
      .single();
    if (siteErr || !site?.id) throw new Error(`Site failed: ${siteErr?.message}`);

    sites.push({
      id: site.id as string,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      customerName,
    });
  }
  return sites;
}

async function seedOperators(
  supabase: SupabaseClient,
  branches: BranchRecord[]
): Promise<OperatorRecord[]> {
  const operators: OperatorRecord[] = [];
  let idx = 0;
  for (const branch of branches) {
    for (let i = 0; i < branch.def.operatorCount; i++) {
      const name = `${OPERATOR_FIRST[idx]} ${OPERATOR_LAST[idx]}`;
      const role = i === 0 ? "lead" : i % 4 === 0 ? "operator" : "driver";
      const hourly = 44 + (idx % 10) * 2.5;
      const certs = ["CDL-A"];
      if (idx % 5 === 0) certs.push("Confined Space");
      if (idx % 7 === 0) certs.push("HAZMAT");
      if (idx % 9 === 0) certs.push("OSHA 30");
      const quals =
        idx % 6 === 0
          ? ["hydrovac", "vacuum", "combo", "jet_vac"]
          : idx % 3 === 0
            ? ["hydrovac", "vacuum"]
            : ["hydrovac", "combo"];
      const { data, error } = await supabase
        .from("fleet_operators")
        .insert({
          branch_id: branch.id,
          name,
          operator_role: role,
          hourly_cost: hourly,
          shift: idx % 8 === 0 ? "night" : "day",
          overtime_rate: hourly * 1.5,
          double_time_rate: hourly * 2,
          skills:
            idx % 4 === 0
              ? ["hydrovac", "confined_space", "environmental"]
              : ["hydrovac", "utility_support"],
          truck_qualifications: quals,
          certifications: certs,
          is_active: idx !== 31,
        })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error(`Operator failed: ${error?.message}`);
      operators.push({ id: data.id as string, branchId: branch.id, name });
      idx++;
    }
  }
  if (operators.length !== TOTAL_OPERATORS) {
    throw new Error(`Expected ${TOTAL_OPERATORS} operators, got ${operators.length}`);
  }
  return operators;
}

function unitSuffix(unitNumber: string): string {
  return unitNumber.replace(DEMO_UNIT_PREFIX, "");
}

async function seedTrucks(
  supabase: SupabaseClient,
  branches: BranchRecord[],
  operators: OperatorRecord[]
): Promise<TruckRecord[]> {
  const trucks: TruckRecord[] = [];
  let unit = 1001;
  let opIdx = 0;

  for (const branch of branches) {
    for (let i = 0; i < branch.def.truckCount; i++) {
      const truckType = pickWeighted(rng, TRUCK_TYPES).type;
      const gallons =
        truckType === "support" || truckType === "service_pickup"
          ? 0
          : TRUCK_TYPES.find((t) => t.type === truckType)?.gallons ?? 3000;
      const fuelPct = intBetween(rng, 28, 96);
      const odometer = intBetween(rng, 42000, 198000);
      const offsetLat = (rng() - 0.5) * 0.018;
      const offsetLng = (rng() - 0.5) * 0.018;
      const homeLat = branch.def.latitude + offsetLat;
      const homeLng = branch.def.longitude + offsetLng;
      const branchOps = operators.filter((o) => o.branchId === branch.id);
      const operator = branchOps[i % branchOps.length] ?? operators[opIdx % operators.length];
      opIdx++;

      const unitNumber = `${DEMO_UNIT_PREFIX}${unit}`;
      const suffix = String(unit);
      let status = "active";
      let notes = `Primary operator: ${operator.name}`;

      if (STAGED_PM_UNITS.includes(suffix as (typeof STAGED_PM_UNITS)[number])) {
        if (suffix === "1021") {
          status = "maintenance";
          notes = "Scheduled PM — hydraulic pump service | Primary operator: " + operator.name;
        } else {
          notes = `Maintenance soon — PM due within 48h (${intBetween(rng, 120, 480)} mi) | Primary operator: ${operator.name}`;
        }
      }

      const { data, error } = await supabase
        .from("trucks")
        .insert({
          branch_id: branch.id,
          unit_number: unitNumber,
          truck_type: truckType,
          capacity: {
            daily_hours: 10,
            gallons,
            fuel_level_pct: fuelPct,
            odometer_miles: odometer,
            primary_operator_id: operator.id,
          },
          status,
          telematics_device_id: `SAM-${unit}`,
          home_latitude: homeLat,
          home_longitude: homeLng,
          external_asset_id: `PIS-TRK-${unit}`,
          notes,
        })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error(`Truck ${unitNumber} failed: ${error?.message}`);

      trucks.push({
        id: data.id as string,
        branchCode: branch.code,
        branchId: branch.id,
        unitNumber,
        truckType,
        homeLat,
        homeLng,
      });
      unit++;
    }
  }
  if (trucks.length !== TOTAL_TRUCKS) {
    throw new Error(`Expected ${TOTAL_TRUCKS} trucks, got ${trucks.length}`);
  }
  return trucks;
}

async function seedOperatorAvailability(
  supabase: SupabaseClient,
  tenantId: string,
  operators: OperatorRecord[]
): Promise<void> {
  const boardDate = demoBoardDate();
  const today = todayDateOnly();
  const ptoIndices = [3, 17, 28];
  const ptoRows = ptoIndices.map((idx) => ({
    tenant_id: tenantId,
    operator_id: operators[idx].id,
    start_date: boardDate,
    end_date: boardDate,
    reason: pick(rng, ["PTO", "Family leave", "Training day", "Medical appointment"]),
  }));
  await insertBatches(supabase, "fleet_operator_time_off", ptoRows);

  const hourRows: Array<Record<string, unknown>> = [];
  for (let d = -6; d <= 0; d++) {
    const date = addDays(today, d);
    for (let i = 0; i < operators.length; i++) {
      if (ptoIndices.includes(i) && date === boardDate) continue;
      hourRows.push({
        tenant_id: tenantId,
        operator_id: operators[i].id,
        date,
        committed_hours: intBetween(rng, 3, 6),
      });
    }
  }
  await insertBatches(supabase, "fleet_operator_hours_daily", hourRows);
}

async function seedJobs(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  branches: BranchRecord[],
  sites: SiteRecord[],
  trucks: TruckRecord[]
): Promise<number> {
  const rows = buildDemoJobs(rng, branches, sites, trucks).map((j) => ({
    ...j,
    tenant_id: tenantId,
    company_id: companyId,
  }));
  await insertBatches(supabase, "fleet_jobs", rows);
  return rows.length;
}

async function seedIntegrations(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Record<string, string>> {
  const now = new Date().toISOString();
  const stale = hoursAgoIso(6);

  const connections = [
    {
      tenant_id: tenantId,
      provider: "csv_manual",
      display_name: "CSV Job Import",
      status: "active",
      config: { poll_interval_sec: 300, mode: "import" },
      last_sync_at: minutesAgoIso(4),
    },
    {
      tenant_id: tenantId,
      provider: "samsara",
      display_name: "Samsara Fleet",
      status: "active",
      config: { poll_interval_sec: 300 },
      last_sync_at: minutesAgoIso(3),
    },
    {
      tenant_id: tenantId,
      provider: "fleetio",
      display_name: "Fleetio Maintenance",
      status: "active",
      config: { poll_interval_sec: 600 },
      last_sync_at: minutesAgoIso(22),
    },
    {
      tenant_id: tenantId,
      provider: "quickbooks",
      display_name: "QuickBooks Online",
      status: "active",
      config: { poll_interval_sec: 3600, mode: "read_only" },
      last_sync_at: minutesAgoIso(45),
    },
    {
      tenant_id: tenantId,
      provider: "webhook_telematics",
      display_name: "Telematics Webhook",
      status: "active",
      config: { poll_interval_sec: 120 },
      last_sync_at: minutesAgoIso(2),
    },
    {
      tenant_id: tenantId,
      provider: "webhook_jobs",
      display_name: "Dispatch Webhook",
      status: "error",
      config: { poll_interval_sec: 300 },
      last_sync_at: stale,
      last_error: "Webhook endpoint returned 503 — retry scheduled",
    },
  ];

  const ids: Record<string, string> = {};
  const skipped: string[] = [];
  for (const conn of connections) {
    const { data, error } = await supabase
      .from("integration_connections")
      .insert(conn)
      .select("id, provider")
      .single();
    if (error || !data?.id) {
      if (error?.message.includes("provider_check") && ["fleetio", "quickbooks"].includes(conn.provider)) {
        skipped.push(conn.provider);
        continue;
      }
      throw new Error(`Integration failed: ${error?.message}`);
    }
    ids[data.provider as string] = data.id as string;

    await supabase.from("integration_sync_runs").insert({
      connection_id: data.id,
      status: conn.status === "error" ? "failed" : "success",
      finished_at: conn.last_sync_at,
      records_processed: intBetween(rng, 12, 180),
      records_failed: conn.status === "error" ? 3 : 0,
      error_summary: conn.status === "error" ? conn.last_error : null,
    });
  }
  if (skipped.length > 0) {
    console.log(`    Skipped optional integrations (apply enterprise migration): ${skipped.join(", ")}`);
  }
  return ids;
}

async function seedTelematics(
  supabase: SupabaseClient,
  tenantId: string,
  trucks: TruckRecord[],
  sites: SiteRecord[],
  connectionId: string | undefined
): Promise<number> {
  const events: Array<Record<string, unknown>> = [];
  let eventSeq = 0;

  for (let ti = 0; ti < trucks.length; ti++) {
    const truck = trucks[ti];
    const dest = sites[ti % sites.length];
    const suffix = unitSuffix(truck.unitNumber);
    const profile = STAGED_GPS_OFFLINE_UNITS.includes(suffix as (typeof STAGED_GPS_OFFLINE_UNITS)[number])
      ? "offline"
      : STAGED_GPS_STALE_UNITS.includes(suffix as (typeof STAGED_GPS_STALE_UNITS)[number])
        ? "stale"
        : "online";

    const tripPoints = 8;
    for (let p = 0; p < tripPoints; p++) {
      const t = p / (tripPoints - 1);
      const lat = lerp(truck.homeLat, dest.latitude, t);
      const lng = lerp(truck.homeLng, dest.longitude, t);
      const hoursBack =
        profile === "offline" ? 4 + p * 0.1 : profile === "stale" ? 0.35 : p * 0.02;
      const recordedAt =
        profile === "online" && p === tripPoints - 1
          ? minutesAgoIso(2 + (ti % 5))
          : profile === "stale" && p === tripPoints - 1
            ? minutesAgoIso(18 + (ti % 3))
            : hoursAgoIso(hoursBack);

      const speed = p === 0 || p === tripPoints - 1 ? 0 : 25 + rng() * 35;
      const idle = speed < 3;
      const odometer =
        Number(suffix) * 10 + p * 1.2 + (profile === "offline" ? 0 : ti);

      events.push({
        tenant_id: tenantId,
        truck_id: truck.id,
        connection_id: connectionId ?? null,
        recorded_at: recordedAt,
        latitude: lat + (rng() - 0.5) * 0.001,
        longitude: lng + (rng() - 0.5) * 0.001,
        speed_mph: Math.round(speed * 10) / 10,
        odometer_miles: Math.round(odometer * 10) / 10,
        engine_on: profile !== "offline" || p < tripPoints - 2,
        idle,
        heading_deg: intBetween(rng, 0, 359),
        source: "backfill",
        external_event_id: `PIS-TEL-${suffix}-${eventSeq++}`,
        raw_payload: { demo: true, profile },
      });
    }
  }

  await insertBatches(supabase, "telematics_events", events, 100);
  return events.length;
}

async function seedOperatingProfitability(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  trucks: TruckRecord[]
): Promise<void> {
  const { error: rulesError } = await supabase.from("company_operating_rules").upsert(
    {
      tenant_id: tenantId,
      company_id: companyId,
      regular_hours_per_day: 8,
      regular_hours_per_week: 40,
      daily_overtime_threshold: 8,
      weekly_overtime_threshold: 40,
      overtime_multiplier: 1.5,
      double_time_threshold: 12,
      double_time_multiplier: 2,
      default_operator_hourly_rate: 48,
      fuel_cost_per_mile: 0.92,
      idle_cost_per_hour: 38,
      truck_fixed_cost_per_hour: 32,
      night_shift_premium: 0.15,
    },
    { onConflict: "company_id" }
  );
  if (rulesError) throw new Error(`Operating rules failed: ${rulesError.message}`);

  const typeProfiles: Record<string, { fuel: number; idle: number; fixed: number }> = {
    hydrovac: { fuel: 1.05, idle: 42, fixed: 36 },
    vacuum: { fuel: 0.95, idle: 38, fixed: 32 },
    combo: { fuel: 1.1, idle: 44, fixed: 38 },
    jet_vac: { fuel: 1.0, idle: 40, fixed: 34 },
    support: { fuel: 0.75, idle: 28, fixed: 22 },
  };

  for (const [truckType, costs] of Object.entries(typeProfiles)) {
    const { error } = await supabase.from("truck_cost_profiles").upsert(
      {
        tenant_id: tenantId,
        company_id: companyId,
        truck_type: truckType,
        fuel_cost_per_mile: costs.fuel,
        idle_cost_per_hour: costs.idle,
        fixed_cost_per_hour: costs.fixed,
      },
      { onConflict: "company_id,truck_type", ignoreDuplicates: false }
    );
    if (error && !error.message.includes("duplicate")) {
      // type unique index may not support upsert onConflict — fall back to delete+insert pattern
      await supabase
        .from("truck_cost_profiles")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("company_id", companyId)
        .eq("truck_type", truckType);
      await supabase.from("truck_cost_profiles").insert({
        tenant_id: tenantId,
        company_id: companyId,
        truck_type: truckType,
        fuel_cost_per_mile: costs.fuel,
        idle_cost_per_hour: costs.idle,
        fixed_cost_per_hour: costs.fixed,
      });
    }
  }

  for (let i = 0; i < Math.min(8, trucks.length); i++) {
    const truck = trucks[i];
    const base = typeProfiles[truck.truckType] ?? typeProfiles.hydrovac;
    await supabase.from("truck_cost_profiles").upsert(
      {
        tenant_id: tenantId,
        company_id: companyId,
        truck_id: truck.id,
        fuel_cost_per_mile: base.fuel * 1.05,
        idle_cost_per_hour: base.idle * 1.08,
        fixed_cost_per_hour: base.fixed * 1.1,
      },
      { onConflict: "truck_id" }
    );
  }
}

export async function seedPeachtreeFleetDemo(
  supabase: SupabaseClient
): Promise<PeachtreeSeedResult> {
  console.log("  Ensuring tenant & company…");
  const { tenantId, companyId } = await ensureTenantAndCompany(supabase);

  console.log("  Seeding branches…");
  const branches = await seedBranches(supabase, tenantId, companyId);

  console.log("  Seeding customers & sites…");
  const sites = await seedCustomersAndSites(supabase, tenantId, companyId);

  console.log("  Seeding operators…");
  const operators = await seedOperators(supabase, branches);

  console.log("  Seeding operator PTO & hours…");
  await seedOperatorAvailability(supabase, tenantId, operators);

  console.log("  Seeding trucks…");
  const trucks = await seedTrucks(supabase, branches, operators);

  console.log("  Seeding operating rules & cost profiles…");
  await seedOperatingProfitability(supabase, tenantId, companyId, trucks);

  console.log("  Seeding jobs…");
  const jobCount = await seedJobs(supabase, tenantId, companyId, branches, sites, trucks);

  console.log("  Seeding integrations…");
  const connectionIds = await seedIntegrations(supabase, tenantId);

  console.log("  Seeding telematics…");
  const telematicsCount = await seedTelematics(
    supabase,
    tenantId,
    trucks,
    sites,
    connectionIds.webhook_telematics
  );

  const fromDate = addDays(todayDateOnly(), -MART_HISTORY_DAYS);
  const toDate = demoBoardDate();
  console.log(`  Refreshing utilization marts (${fromDate} → ${toDate})…`);
  const martResult = await refreshUtilizationDailyForTenant(
    supabase,
    tenantId,
    fromDate,
    toDate
  );
  console.log(
    `    ${martResult.utilizationRowsUpserted} utilization rows, ${martResult.capacityRowsUpserted} capacity snapshots`
  );

  const boardDate = demoBoardDate();
  console.log(`  Generating recommendations for demo board (${boardDate})…`);
  const recs = await getFleetRecommendations(supabase, tenantId, {
    date: boardDate,
    forceRefresh: true,
  });
  console.log(`    ${recs.pending.length} recommendations generated`);

  return {
    tenantId,
    companyId,
    branchIds: Object.fromEntries(branches.map((b) => [b.code, b.id])),
    truckCount: trucks.length,
    operatorCount: operators.length,
    jobCount,
    telematicsCount,
    recommendationCount: recs.pending.length,
    demoBoardDate: boardDate,
  };
}
