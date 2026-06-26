import {
  BRANCHES,
  DEMO_DAY_JOB_TARGET,
  DEMO_DAY_OFFSET,
  DEMO_DAY_UNASSIGNED_TARGET,
  JOB_TYPES,
  MART_HISTORY_DAYS,
  type BranchDef,
} from "./constants";
import { STAGED_UNASSIGNED_JOBS } from "./scenarios";
import {
  etSlotIso,
  hoursAgoIso,
  intBetween,
  jobDescription,
  moneyBetween,
  pick,
  todayDateOnly,
} from "./utils";

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
};

export type JobRow = {
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

export function buildDemoJobs(
  rng: () => number,
  branches: BranchRecord[],
  sites: SiteRecord[],
  trucks: TruckRecord[]
): JobRow[] {
  const jobs: JobRow[] = [];
  let seq = 1;
  const branchByCode = Object.fromEntries(branches.map((b) => [b.code, b]));
  const siteFor = (i: number) => sites[i % sites.length];

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
    dayOffset?: number;
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

  // Historical completed jobs (90 days) — mature analytics
  const historyTarget = Math.max(290, MART_HISTORY_DAYS * 3);
  for (let i = 0; i < historyTarget; i++) {
    const dayOffset = -intBetween(rng, 1, MART_HISTORY_DAYS);
    const hour = intBetween(rng, 6, 16);
    const estHours = pick(rng, [3, 4, 5, 6, 7, 8]);
    const start = etSlotIso(dayOffset, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = pick(rng, branches);
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks.length ? pick(rng, branchTrucks) : null;
    const jobType = pick(rng, JOB_TYPES);
    const isLarge = rng() < 0.06;
    const revenue = isLarge
      ? moneyBetween(rng, 18000, 42000)
      : moneyBetween(rng, 1800, 14000);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(i),
        status: "completed",
        priority: pick(rng, ["low", "medium", "medium", "high"]),
        start,
        end,
        revenue,
        truckType: truck?.truckType ?? pick(rng, ["hydrovac", "vacuum", "combo"]),
        truckId: truck?.id ?? null,
        title: `${jobType} — ${siteFor(i).customerName}`,
        jobType,
        estHours,
        actHours: estHours * (0.85 + rng() * 0.28),
      })
    );
  }

  // Today (day 0): live operations — en route, working, idle context
  for (let i = 0; i < 14; i++) {
    const estHours = pick(rng, [4, 5, 6, 7, 8]);
    const startedHoursAgo = 0.5 + rng() * (estHours - 0.5);
    const start = hoursAgoIso(startedHoursAgo);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = pick(rng, branches);
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[i % branchTrucks.length];
    const jobType = pick(rng, JOB_TYPES);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(300 + i),
        status: "in_progress",
        priority: i < 3 ? "urgent" : pick(rng, ["medium", "high"]),
        start,
        end,
        revenue: moneyBetween(rng, 2800, 12000),
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${jobType} — ${siteFor(300 + i).name}`,
        jobType,
        estHours,
        actHours: startedHoursAgo,
        emergency: i === 0,
      })
    );
  }

  // Demo day (tomorrow): 38 jobs — primary screenshot day
  const demoDay = DEMO_DAY_OFFSET;
  let demoCount = 0;

  for (const staged of STAGED_UNASSIGNED_JOBS) {
    const branch = branchByCode[staged.branchCode];
    if (!branch) continue;
    const start = etSlotIso(demoDay, staged.hourET);
    const end = new Date(Date.parse(start) + staged.estHours * 3600000).toISOString();
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(staged.siteIndex),
        status: "unassigned",
        priority: staged.priority,
        start,
        end,
        revenue: staged.revenue,
        truckType: staged.truckType,
        truckId: null,
        title: staged.title,
        jobType: staged.jobType,
        estHours: staged.estHours,
        actHours: null,
        emergency: staged.emergency,
      })
    );
    demoCount++;
  }

  // Fill demo day with unassigned jobs for dispatch queue depth (30+ to assign)
  let unassignedDemoCount = STAGED_UNASSIGNED_JOBS.length;
  let unassignedIdx = 0;
  while (unassignedDemoCount < DEMO_DAY_UNASSIGNED_TARGET) {
    const branch = pick(rng, branches);
    const hour = intBetween(rng, 6, 16);
    const estHours = pick(rng, [4, 5, 6, 7, 8]);
    const start = etSlotIso(demoDay, hour, intBetween(rng, 0, 45));
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const jobType = pick(rng, JOB_TYPES);
    const site = siteFor(650 + unassignedIdx);
    const revenue = moneyBetween(rng, 3200, 12500);
    jobs.push(
      makeJob({
        branchId: branch.id,
        site,
        status: "unassigned",
        priority: pick(rng, ["medium", "high", "urgent"]),
        start,
        end,
        revenue,
        truckType: pick(rng, ["hydrovac", "vacuum", "combo", "jet_vac"]),
        truckId: null,
        title: `${jobType} — ${site.name}`,
        jobType,
        estHours,
        actHours: null,
        emergency: rng() < 0.08,
      })
    );
    unassignedDemoCount++;
    unassignedIdx++;
    demoCount++;
  }

  // Demo day assigned / in-progress / scheduled filler
  const demoBranches = [
    { code: "ATN", count: 6 },
    { code: "ATS", count: 5 },
    { code: "MAC", count: 4 },
    { code: "SAV", count: 3 },
    { code: "AUG", count: 2 },
  ];

  let fillerIdx = 0;
  for (const { code, count } of demoBranches) {
    const branch = branchByCode[code];
    if (!branch) continue;
    const branchTrucks = trucksForBranch(trucks, branch.id);
    for (let i = 0; i < count && demoCount < DEMO_DAY_JOB_TARGET; i++) {
      const hour = intBetween(rng, 6, 16);
      const estHours = pick(rng, [4, 5, 6, 7, 8]);
      const start = etSlotIso(demoDay, hour, intBetween(rng, 0, 45));
      const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
      const truck = branchTrucks[i % branchTrucks.length];
      const jobType = pick(rng, JOB_TYPES);
      const statusRoll = rng();
      const status =
        statusRoll < 0.35
          ? "in_progress"
          : statusRoll < 0.75
            ? "scheduled"
            : "scheduled";
      const revenue = moneyBetween(rng, 3200, 11500);
      jobs.push(
        makeJob({
          branchId: branch.id,
          site: siteFor(400 + fillerIdx),
          status,
          priority: pick(rng, ["medium", "high", "urgent"]),
          start,
          end,
          revenue,
          truckType: truck.truckType,
          truckId: truck.id,
          title: `${jobType} — ${siteFor(400 + fillerIdx).name}`,
          jobType,
          estHours,
          actHours: status === "in_progress" ? estHours * 0.35 : null,
        })
      );
      demoCount++;
      fillerIdx++;
    }
  }

  // Atlanta South capacity pressure — stacked jobs on demo day (106%+ utilization)
  const ats = branchByCode.ATS;
  if (ats) {
    const atsTrucks = trucksForBranch(trucks, ats.id);
    for (let i = 0; i < 4; i++) {
      const hour = intBetween(rng, 7, 12);
      const estHours = pick(rng, [7, 8, 9]);
      const start = etSlotIso(demoDay, hour);
      const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
      const truck = atsTrucks[i % atsTrucks.length];
      jobs.push(
        makeJob({
          branchId: ats.id,
          site: siteFor(500 + i),
          status: i < 2 ? "in_progress" : "scheduled",
          priority: "high",
          start,
          end,
          revenue: moneyBetween(rng, 4500, 9800),
          truckType: truck.truckType,
          truckId: truck.id,
          title: `${pick(rng, JOB_TYPES)} — ${siteFor(500 + i).name}`,
          jobType: pick(rng, JOB_TYPES),
          estHours,
          actHours: i < 2 ? estHours * 0.4 : null,
        })
      );
    }
    for (let i = 0; i < 8; i++) {
      const truck = atsTrucks[i % atsTrucks.length];
      const estHours = pick(rng, [8, 9, 9, 10]);
      const start = etSlotIso(demoDay, 6 + (i % 4));
      const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
      jobs.push(
        makeJob({
          branchId: ats.id,
          site: siteFor(520 + i),
          status: "scheduled",
          priority: "high",
          start,
          end,
          revenue: moneyBetween(rng, 3800, 8200),
          truckType: truck.truckType,
          truckId: truck.id,
          title: `${pick(rng, JOB_TYPES)} — ${siteFor(520 + i).name}`,
          jobType: pick(rng, JOB_TYPES),
          estHours,
          actHours: null,
        })
      );
    }
  }

  // Day after demo (+2): lighter load
  for (let i = 0; i < 10; i++) {
    const hour = intBetween(rng, 8, 15);
    const estHours = pick(rng, [3, 4, 5, 6]);
    const start = etSlotIso(demoDay + 1, hour);
    const end = new Date(Date.parse(start) + estHours * 3600000).toISOString();
    const branch = pick(rng, branches);
    const branchTrucks = trucksForBranch(trucks, branch.id);
    const truck = branchTrucks[i % branchTrucks.length];
    jobs.push(
      makeJob({
        branchId: branch.id,
        site: siteFor(600 + i),
        status: "scheduled",
        priority: "medium",
        start,
        end,
        revenue: moneyBetween(rng, 2400, 7800),
        truckType: truck.truckType,
        truckId: truck.id,
        title: `${pick(rng, JOB_TYPES)} — ${siteFor(600 + i).name}`,
        jobType: pick(rng, JOB_TYPES),
        estHours,
        actHours: null,
      })
    );
  }

  void todayDateOnly;
  return jobs;
}
