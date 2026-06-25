import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshUtilizationDailyForTenant } from "../../src/lib/fleet/marts/refresh-utilization-daily";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import {
  BRANCHES,
  CUSTOMERS,
  JOB_TYPES,
  OPERATOR_FIRST,
  OPERATOR_LAST,
  PEACHTREE_COMPANY,
  PEACHTREE_TENANT,
  SITE_LOCATIONS,
  TRUCK_TYPES,
  type BranchDef,
} from "./constants";
import {
  addDays,
  etSlotIso,
  hoursAgoIso,
  insertBatches,
  intBetween,
  jobDescription,
  lerp,
  minutesAgoIso,
  moneyBetween,
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
  jobCount: number;
  telematicsCount: number;
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
  const perBranch = [11, 10, 9]; // 30 total
  let idx = 0;
  for (let b = 0; b < branches.length; b++) {
    const branch = branches[b];
    for (let i = 0; i < perBranch[b]; i++) {
      const name = `${OPERATOR_FIRST[idx]} ${OPERATOR_LAST[idx]}`;
      const role = i === 0 ? "lead" : i % 3 === 0 ? "operator" : "driver";
      const hourly = 42 + (idx % 8) * 3;
      const { data, error } = await supabase
        .from("fleet_operators")
        .insert({
          branch_id: branch.id,
          name,
          operator_role: role,
          hourly_cost: hourly,
          shift: idx % 7 === 0 ? "night" : "day",
          overtime_rate: hourly * 1.5,
          double_time_rate: hourly * 2,
          skills: idx % 4 === 0 ? ["hydrovac", "confined_space"] : ["hydrovac"],
          truck_qualifications: ["hydrovac", "vacuum", "combo"],
          certifications: idx % 5 === 0 ? ["CDL-A", "Confined Space"] : ["CDL-A"],
          is_active: true,
        })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error(`Operator failed: ${error?.message}`);
      operators.push({ id: data.id as string, branchId: branch.id, name });
      idx++;
    }
  }
  return operators;
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
        truckType === "support"
          ? 0
          : TRUCK_TYPES.find((t) => t.type === truckType)?.gallons ?? 3000;
      const fuelPct = intBetween(rng, 28, 96);
      const odometer = intBetween(rng, 42000, 198000);
      const offsetLat = (rng() - 0.5) * 0.02;
      const offsetLng = (rng() - 0.5) * 0.02;
      const homeLat = branch.def.latitude + offsetLat;
      const homeLng = branch.def.longitude + offsetLng;
      const operator = operators[opIdx % operators.length];
      opIdx++;

      const statusRoll = rng();
      let status = "active";
      let notes: string | null = null;
      if (statusRoll > 0.94) {
        status = "maintenance";
        notes = "Scheduled PM — brake inspection";
      } else if (statusRoll > 0.88) {
        notes = "Maintenance soon — 500 mi to service interval";
      }

      const { data, error } = await supabase
        .from("trucks")
        .insert({
          branch_id: branch.id,
          unit_number: String(unit),
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
          notes: notes ?? `Primary operator: ${operator.name}`,
        })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error(`Truck ${unit} failed: ${error?.message}`);

      trucks.push({
        id: data.id as string,
        branchCode: branch.code,
        branchId: branch.id,
        unitNumber: String(unit),
        truckType,
        homeLat,
        homeLng,
      });
      unit++;
    }
  }
  return trucks;
}

type JobRow = {
  branch_id: string;
  customer_site_id: string;
  status: string;
  priority: string;
  scheduled_start: string;
  scheduled_end: string;
  revenue_estimate: number;
  required_truck_type: string;
  assigned_truck_id: string | null;
  external_source_id: string;
  title: string;
  description: string;
};

function trucksForBranch(trucks: TruckRecord[], branchId: string, type?: string): TruckRecord[] {
  return trucks.filter(
    (t) => t.branchId === branchId && (!type || t.truckType === type || t.truckType === "combo")
  );
}

function buildJobs(
  branches: BranchRecord[],
  sites: SiteRecord[],
  trucks: TruckRecord[]
): JobRow[] {
  const jobs: JobRow[] = [];
  let seq = 1;
  const today = todayDateOnly();

  const makeJob = (opts: {
    branchId: string;
    site: SiteRecord;
    status: string;
    priority: string;
    start: string;
    end: string;
    revenue: number;
    truckType: string;
    truckId: string | null;
    title: string;
    jobType: string;
    estHours: number;
    actHours: number | null;
    emergency?: boolean;
  }): JobRow => {
    const id = `PIS-JOB-${String(seq).padStart(4, "0")}`;
    seq++;
    const prefix = opts.emergency ? "Emergency: " : "";
    return {
      branch_id: opts.branchId,
      customer_site_id: opts.site.id,
      status: opts.status,
      priority: opts.priority,
      scheduled_start: opts.start,
      scheduled_end: opts.end,
      revenue_estimate: opts.revenue,
      required_truck_type: opts.truckType,
      assigned_truck_id: opts.truckId,
      external_source_id: id,
      title: `${prefix}${opts.title}`,
      description: jobDescription(opts.jobType, opts.estHours, opts.actHours, opts.revenue),
    };
  };

  const siteFor = (i: number) => sites[i % sites.length];
  const branchByCode = Object.fromEntries(branches.map((b) => [b.code, b]));

  // 150 completed jobs over last 45 days
  for (let i = 0; i < 150; i++) {
    const dayOffset = -intBetween(rng, 1, 45);
    const hour = intBetween(rng, 6, 16);
    const estHours = pick(rng, [3, 4, 5, 6, 7, 8]);
    const start = etSlotIso(dayOffset, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = pick(rng, branches);
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks.length ? pick(rng, branchTrucks) : null;
    const jobType = pick(rng, JOB_TYPES);
    const isLarge = rng() < 0.08;
    const revenue = isLarge
      ? moneyBetween(rng, 20000, 40000)
      : moneyBetween(rng, 1500, 12000);
    const actHours = estHours * (0.85 + rng() * 0.25);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(i),
        status: "completed",
        priority: pick(rng, ["low", "medium", "medium", "high"]),
        start,
        end,
        revenue,
        truckType: truck?.truckType ?? pick(rng, TRUCK_TYPES).type,
        truckId: truck?.id ?? null,
        title: `${jobType} — ${siteFor(i).customerName}`,
        jobType,
        estHours,
        actHours,
      })
    );
  }

  // 25 in-progress (today)
  for (let i = 0; i < 25; i++) {
    const estHours = pick(rng, [4, 5, 6, 7, 8]);
    const startedHoursAgo = rng() * (estHours - 0.5);
    const start = hoursAgoIso(startedHoursAgo);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch =
      i < 14 ? branchByCode.MAR : i < 20 ? branchByCode.GVL : branchByCode.MAC;
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[i % branchTrucks.length];
    const jobType = pick(rng, JOB_TYPES);
    const revenue = moneyBetween(rng, 2200, 14000);
    const urgent = i < 5;
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(150 + i),
        status: "in_progress",
        priority: urgent ? "urgent" : pick(rng, ["medium", "high"]),
        start,
        end,
        revenue,
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${jobType} — ${siteFor(150 + i).name}`,
        jobType,
        estHours,
        actHours: startedHoursAgo,
        emergency: i < 2,
      })
    );
  }

  // 18 scheduled today (future slots)
  for (let i = 0; i < 18; i++) {
    const hour = intBetween(rng, 13, 20);
    const estHours = pick(rng, [3, 4, 5, 6]);
    const start = etSlotIso(0, hour, intBetween(rng, 0, 45));
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch =
      i < 10 ? branchByCode.MAR : i < 15 ? branchByCode.GVL : branchByCode.MAC;
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[(i + 3) % branchTrucks.length];
    const jobType = pick(rng, JOB_TYPES);
    const revenue = moneyBetween(rng, 1800, 11000);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(175 + i),
        status: "scheduled",
        priority: pick(rng, ["low", "medium", "high"]),
        start,
        end,
        revenue,
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${jobType} — ${siteFor(175 + i).name}`,
        jobType,
        estHours,
        actHours: null,
      })
    );
  }

  // 3 late jobs (scheduled start in past, still scheduled)
  for (let i = 0; i < 3; i++) {
    const estHours = pick(rng, [4, 5, 6]);
    const start = hoursAgoIso(2.5 + i * 0.5);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = branchByCode.MAR;
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[i];
    const jobType = pick(rng, JOB_TYPES);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(193 + i),
        status: "scheduled",
        priority: "high",
        start,
        end,
        revenue: moneyBetween(rng, 3500, 9000),
        truckType: truck.truckType,
        truckId: truck.id,
        title: `Late: ${jobType} — ${siteFor(193 + i).name}`,
        jobType,
        estHours,
        actHours: null,
      })
    );
  }

  // 6 unassigned (urgent/high mix) — Marietta heavy for overload demo
  for (let i = 0; i < 6; i++) {
    const hour = intBetween(rng, 9, 17);
    const estHours = pick(rng, [4, 5, 6, 7]);
    const start = etSlotIso(0, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = i < 4 ? branchByCode.MAR : branchByCode.GVL;
    const jobType = pick(rng, JOB_TYPES);
    const isUrgent = i < 4;
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(196 + i),
        status: "unassigned",
        priority: isUrgent ? "urgent" : "high",
        start,
        end,
        revenue: moneyBetween(rng, isUrgent ? 4500 : 2500, isUrgent ? 12000 : 8000),
        truckType: pick(rng, ["hydrovac", "vacuum", "combo"]),
        truckId: null,
        title: `${jobType} — ${siteFor(196 + i).customerName}`,
        jobType,
        estHours,
        actHours: null,
        emergency: i === 0 || i === 1,
      })
    );
  }

  // Extra Marietta today jobs to push utilization ~94%
  const marTrucks = trucksForBranch(trucks, branchByCode.MAR.id);
  for (let i = 0; i < 8; i++) {
    const hour = intBetween(rng, 7, 11);
    const estHours = pick(rng, [6, 7, 8, 9]);
    const start = etSlotIso(0, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const truck = marTrucks[i % marTrucks.length];
    const jobType = pick(rng, JOB_TYPES);
    jobs.push(
      makeJob({
        branchId: branchByCode.MAR.id,
        site: siteFor(202 + i),
        status: i < 4 ? "in_progress" : "scheduled",
        priority: pick(rng, ["medium", "high"]),
        start,
        end,
        revenue: moneyBetween(rng, 3000, 9500),
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${jobType} — ${siteFor(202 + i).name}`,
        jobType,
        estHours,
        actHours: i < 4 ? estHours * 0.4 : null,
      })
    );
  }

  // Future scheduled filler
  for (let i = 0; i < 12; i++) {
    const dayOffset = intBetween(rng, 1, 7);
    const hour = intBetween(rng, 7, 15);
    const estHours = pick(rng, [3, 4, 5]);
    const start = etSlotIso(dayOffset, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = pick(rng, branches);
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[i % branchTrucks.length];
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(210 + i),
        status: "scheduled",
        priority: "medium",
        start,
        end,
        revenue: moneyBetween(rng, 2000, 8000),
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${pick(rng, JOB_TYPES)} — ${siteFor(210 + i).name}`,
        jobType: pick(rng, JOB_TYPES),
        estHours,
        actHours: null,
      })
    );
  }

  void today; // anchor demo date context
  return jobs;
}

async function seedJobs(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string,
  branches: BranchRecord[],
  sites: SiteRecord[],
  trucks: TruckRecord[]
): Promise<number> {
  const rows = buildJobs(branches, sites, trucks).map((j) => ({
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
      config: { poll_interval_sec: 300 },
      last_sync_at: minutesAgoIso(4),
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
      provider: "samsara",
      display_name: "Samsara Fleet",
      status: "active",
      config: { poll_interval_sec: 300 },
      last_sync_at: minutesAgoIso(8),
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
  for (const conn of connections) {
    const { data, error } = await supabase
      .from("integration_connections")
      .insert(conn)
      .select("id, provider")
      .single();
    if (error || !data?.id) throw new Error(`Integration failed: ${error?.message}`);
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
    const profile =
      ti >= trucks.length - 2 ? "offline" : ti >= trucks.length - 5 ? "stale" : "online";

    const tripPoints = 8;
    for (let p = 0; p < tripPoints; p++) {
      const t = p / (tripPoints - 1);
      const lat = lerp(truck.homeLat, dest.latitude, t);
      const lng = lerp(truck.homeLng, dest.longitude, t);
      const hoursBack = profile === "offline" ? 4 + p * 0.1 : profile === "stale" ? 0.35 : p * 0.02;
      const recordedAt =
        profile === "online" && p === tripPoints - 1
          ? minutesAgoIso(2 + (ti % 5))
          : profile === "stale" && p === tripPoints - 1
            ? minutesAgoIso(18 + (ti % 3))
            : hoursAgoIso(hoursBack);

      const speed = p === 0 || p === tripPoints - 1 ? 0 : 25 + rng() * 35;
      const idle = speed < 3;
      const odometer =
        Number(truck.unitNumber) * 10 + p * 1.2 + (profile === "offline" ? 0 : ti);

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
        external_event_id: `PIS-TEL-${truck.unitNumber}-${eventSeq++}`,
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

  const fromDate = addDays(todayDateOnly(), -45);
  const toDate = todayDateOnly();
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

  console.log("  Generating recommendations…");
  const recs = await getFleetRecommendations(supabase, tenantId, { forceRefresh: true });
  console.log(`    ${recs.pending.length} recommendations generated`);

  return {
    tenantId,
    companyId,
    branchIds: Object.fromEntries(branches.map((b) => [b.code, b.id])),
    truckCount: trucks.length,
    jobCount,
    telematicsCount,
  };
}
