/**
 * Demo seed steps: one tenant at a time.
 * Uses Supabase admin client. Idempotent where possible (skip if slug exists).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPexelsImage } from "../../src/lib/images/pexels";
import { getPexelsQueryForAssetType } from "../../src/lib/images/assetImageQueries";
import type { DemoTenantConfig, ProductConfig } from "./config";

const BATCH = 80;

const DEFAULT_COST_BY_CATEGORY: Record<string, number> = {
  HVAC: 28.5,
  Mechanical: 32.0,
  Electrical: 35.0,
  Lighting: 42.0,
  Plumbing: 18.0,
  "Fire Safety": 45.0,
  Security: 38.0,
  "Cooling Tower": 55.0,
  Generator: 120.0,
};
const FALLBACK_DEFAULT_COST = 29.99;

function getDefaultCostForProduct(p: ProductConfig): number {
  return p.defaultCost ?? DEFAULT_COST_BY_CATEGORY[p.category] ?? FALLBACK_DEFAULT_COST;
}

function getReorderPointDefaultForProduct(p: ProductConfig): number {
  return p.reorderPointDefault ?? Math.max(4, Math.floor(p.defaultQuantity * 0.35));
}

// Demo data helpers for sales-ready / QA-useful records
const DEMO_REQUESTERS = [
  { name: "Demo Operations", email: "ops@demo.local" },
  { name: "Facility Manager", email: "fm@demo.local" },
  { name: "Property Supervisor", email: "supervisor@demo.local" },
  { name: "Maintenance Lead", email: "maint@demo.local" },
  { name: "Building Engineer", email: "engineer@demo.local" },
];
const COMPLETION_NOTES = [
  "Replaced filter and verified airflow. Unit operating within spec.",
  "Tightened connections and ran test cycle. No leaks observed.",
  "Calibration completed. All readings within range.",
  "Inspection completed. Minor wear noted; follow-up in 90 days.",
  "Parts replaced per PM checklist. Asset in good condition.",
  "Replaced worn AHU belt, verified alignment, ran unit for 20 minutes with no abnormal vibration.",
  "Cleaned basin and strainers. Checked chemical levels. No corrosion observed.",
  "Trouble signal cleared. Replaced weak battery in panel. Full test passed.",
];
const RESOLUTION_SUMMARIES = [
  "Resolved: repair completed successfully.",
  "Resolved: preventive maintenance completed. No issues found.",
  "Resolved: adjusted settings; monitoring recommended.",
  "Resolved: replaced component. Asset returned to service.",
  "Resolved: inspection passed. Next PM scheduled.",
  "Resolved: belt replacement and alignment. Vibration within spec.",
  "Resolved: cooling tower serviced. No follow-up required.",
  "Resolved: panel battery replaced. All zones normal.",
];
/** Job durations in minutes for realistic schedules (30, 45, 60, 90). */
const DURATION_OPTIONS = [30, 45, 60, 90];

/** All work order statuses used by the app (DB accepts these). */
const WO_STATUSES = [
  "completed",
  "in_progress",
  "scheduled",
  "ready_to_schedule",
  "new",
  "on_hold",
] as const;

type AssetLocationMap = Map<string, { property_id: string | null; building_id: string | null; unit_id: string | null }>;

/**
 * Build demo work orders with dynamic dates around today and a realistic status mix.
 * Ensures dispatch has a full current week (Mon–Fri) with scheduled_start/scheduled_end and no tech overlap.
 * Every WO is assigned to company, property/location, and technician (using fallbacks when needed).
 */
function buildDemoWorkOrdersForTenant(
  tenantId: string,
  companyId: string,
  cfg: DemoTenantConfig,
  woPrefix: string,
  woNumStart: number,
  technicianIds: string[],
  allAssetIds: string[],
  assetLocationById: AssetLocationMap,
  vendorIds: string[],
  defaultPropertyId: string | null,
  defaultBuildingId: string | null
): Record<string, unknown>[] {
  const today = new Date(todayISO() + "T12:00:00");
  const weekStart = startOfWeekMonday(today);
  const allTitles = [...REALISTIC_WO_TITLES, ...cfg.workOrderTitles];
  const priorities = ["low", "medium", "medium", "high", "urgent"] as const;
  const categories = ["repair", "preventive_maintenance", "inspection"] as const;
  let woNum = woNumStart;
  const woBatch: Record<string, unknown>[] = [];

  // Ensure at least one technician so every WO can be assigned
  const techList = technicianIds.length ? technicianIds : [];
  if (techList.length === 0) {
    console.warn("  buildDemoWorkOrdersForTenant: no technicians; work orders will have no assigned_technician_id.");
  }

  const durationMinsDefault = 60;
  // Build week slots with varied durations (30/45/60/90 min). Start times: 8:00, 9:15, 10:30, 13:00, 14:15 so jobs don't overlap.
  const slotStartMinutes = [8 * 60, 9 * 60 + 15, 10 * 60 + 30, 13 * 60, 14 * 60 + 15];
  type Slot = { date: Date; startMinutes: number; durationMinutes: number };
  const todayStrSlots = todayISO();
  const weekSlots: Slot[] = [];
  const todaySlots: Slot[] = [];
  for (let d = 0; d < 5; d++) {
    const day = addDays(weekStart, d);
    if (!isWeekday(day)) continue;
    const dayStr = day.toISOString().slice(0, 10);
    for (let si = 0; si < slotStartMinutes.length; si++) {
      const durationMinutes = DURATION_OPTIONS[si % DURATION_OPTIONS.length];
      const slot = { date: day, startMinutes: slotStartMinutes[si], durationMinutes };
      weekSlots.push(slot);
      if (dayStr === todayStrSlots) todaySlots.push(slot);
    }
  }
  let todaySlotIndex = 0;
  let weekSlotIndex = 0;

  function nextTodaySlot(): { start: Date; end: Date; durationMinutes: number } | null {
    if (todaySlotIndex >= todaySlots.length) return null;
    const s = todaySlots[todaySlotIndex++];
    const start = new Date(s.date);
    start.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
    const end = new Date(start.getTime() + s.durationMinutes * 60 * 1000);
    return { start, end, durationMinutes: s.durationMinutes };
  }
  function nextWeekSlot(): { start: Date; end: Date; durationMinutes: number } | null {
    if (weekSlotIndex >= weekSlots.length) return null;
    const s = weekSlots[weekSlotIndex++];
    const start = new Date(s.date);
    start.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
    const end = new Date(start.getTime() + s.durationMinutes * 60 * 1000);
    return { start, end, durationMinutes: s.durationMinutes };
  }

  function addWO(
    status: (typeof WO_STATUSES)[number],
    scheduledDate: string | null,
    dueDate: string,
    scheduledStart: string | null,
    scheduledEnd: string | null,
    completedAt: string | null,
    assignedTechId: string | null,
    i: number,
    durationMinsOverride?: number,
    titleOverride?: string,
    descriptionOverride?: string,
    completionNotesOverride?: string,
    resolutionSummaryOverride?: string,
    priorityOverride?: string
  ) {
    const durationMins = durationMinsOverride ?? durationMinsDefault;
    const title = titleOverride ?? allTitles[i % allTitles.length];
    const description = descriptionOverride ?? `Demo work order: ${title}`;
    const assetId = allAssetIds[i % allAssetIds.length] ?? null;
    const loc = assetId ? assetLocationById.get(assetId) : null;
    const requester = DEMO_REQUESTERS[i % DEMO_REQUESTERS.length];
    const completionNotes = completionNotesOverride ?? (status === "completed" ? COMPLETION_NOTES[i % COMPLETION_NOTES.length] : null);
    const resolutionSummary = resolutionSummaryOverride ?? (status === "completed" ? RESOLUTION_SUMMARIES[i % RESOLUTION_SUMMARIES.length] : null);
    const created = scheduledDate ? new Date(scheduledDate + "T10:00:00") : new Date(dueDate + "T10:00:00");
    const updated = completedAt ? new Date(completedAt) : (scheduledEnd ? new Date(scheduledEnd) : created);
    const vendorId = assignedTechId && vendorIds.length && i % 6 === 2 ? vendorIds[i % vendorIds.length] ?? null : null;
    const category = categories[i % categories.length];
    const sourceType = category === "preventive_maintenance" ? "preventive_maintenance" : "manual";
    woBatch.push({
      tenant_id: tenantId,
      company_id: companyId,
      work_order_number: `WO-${woPrefix}-${woNum++}`,
      title: `${title}`,
      description,
      status,
      priority: priorityOverride ?? priorities[i % priorities.length],
      category,
      source_type: sourceType,
      asset_id: assetId,
      property_id: loc?.property_id ?? defaultPropertyId,
      building_id: loc?.building_id ?? defaultBuildingId,
      unit_id: loc?.unit_id ?? null,
      assigned_technician_id: assignedTechId,
      requested_by_name: requester.name,
      requested_by_email: requester.email,
      requested_at: created.toISOString(),
      scheduled_date: scheduledDate,
      due_date: dueDate,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      completed_at: completedAt,
      completion_notes: completionNotes,
      resolution_summary: resolutionSummary,
      completed_by_technician_id: status === "completed" ? assignedTechId : null,
      vendor_id: vendorId,
      estimated_hours: durationMins / 60,
      actual_hours: status === "completed" ? durationMins / 60 : null,
      created_at: created.toISOString(),
      updated_at: updated.toISOString(),
    });
  }

  let idx = 0;
  const techRotate = techList.length ? techList : [null];

  // Completed: 25 (~25%) — 5–7 days ago (10), 3–4 days ago (8), yesterday (7). Varied durations.
  for (let i = 0; i < 25; i++, idx++) {
    const daysAgo = i < 10 ? 5 + (i % 3) : i < 18 ? 3 + (i % 2) : 1;
    const sched = addDays(today, -daysAgo);
    const scheduledDate = sched.toISOString().slice(0, 10);
    const durationMins = DURATION_OPTIONS[i % DURATION_OPTIONS.length];
    const start = new Date(sched);
    start.setHours(8 + (i % 4), 0, 0, 0);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    const completedAt = new Date(end.getTime() + 15 * 60 * 1000).toISOString();
    const techId = techRotate[idx % techRotate.length];
    addWO(
      "completed",
      scheduledDate,
      scheduledDate,
      start.toISOString(),
      end.toISOString(),
      completedAt,
      techId,
      idx,
      durationMins
    );
  }

  // In progress: 20 (~20%) — today only; round-robin tech per slot so no overlap
  for (let i = 0; i < 20; i++, idx++) {
    const scheduledDate = todayISO();
    const slot = nextTodaySlot();
    const techId = slot && techList.length ? techList[(todaySlotIndex - 1) % techList.length] : techRotate[idx % techRotate.length];
    if (slot && techId) {
      addWO("in_progress", scheduledDate, scheduledDate, slot.start.toISOString(), slot.end.toISOString(), null, techId, idx, slot.durationMinutes);
    } else {
      addWO("in_progress", scheduledDate, scheduledDate, null, null, null, techId ?? null, idx);
    }
  }

  // Scheduled: 35 (~35%) — current week slots then future 1–14 days; round-robin tech per slot
  for (let i = 0; i < 35; i++, idx++) {
    const slot = nextWeekSlot();
    let scheduledDate: string;
    let start: string | null = null;
    let end: string | null = null;
    let durationMins = durationMinsDefault;
    if (slot) {
      scheduledDate = slot.start.toISOString().slice(0, 10);
      start = slot.start.toISOString();
      end = slot.end.toISOString();
      durationMins = slot.durationMinutes;
    } else {
      const daysAhead = 1 + (i % 14);
      scheduledDate = addDays(today, daysAhead).toISOString().slice(0, 10);
    }
    const techId = slot && techList.length ? techList[(weekSlotIndex - 1) % techList.length] : techRotate[idx % techRotate.length];
    addWO("scheduled", scheduledDate, scheduledDate, start, end, null, techId ?? null, idx, durationMins);
  }

  // Ready to schedule: 8 (~8%)
  for (let i = 0; i < 8; i++, idx++) {
    const dueDate = i < 4 ? todayISO() : addDays(today, 1).toISOString().slice(0, 10);
    const scheduledDate = i % 2 === 0 ? null : todayISO();
    const techId = techRotate[idx % techRotate.length];
    addWO("ready_to_schedule", scheduledDate, dueDate, null, null, null, techId, idx);
  }

  // New: 7 — freshly submitted, unassigned (no technician yet assigned)
  const HIGH_PRIORITY_NEW: string[] = ["urgent", "high", "high", "medium", "medium", "low", "medium"];
  for (let i = 0; i < 7; i++, idx++) {
    const dueDate = addDays(today, 1 + (i % 7)).toISOString().slice(0, 10);
    // Leave new/unscheduled WOs unassigned — realistic for freshly submitted requests
    addWO("new", null, dueDate, null, null, null, null, idx, undefined, undefined, undefined, undefined, undefined, HIGH_PRIORITY_NEW[i]);
  }

  // Overdue: 10 (~10%) — due in past, incomplete; mix of assigned and unassigned
  const OVERDUE_PRIORITIES: string[] = ["urgent", "high", "urgent", "high", "medium", "high", "medium", "urgent", "high", "medium"];
  for (let i = 0; i < 10; i++, idx++) {
    const daysAgo = 1 + (i % 5);
    const dueDate = addDays(today, -daysAgo).toISOString().slice(0, 10);
    // First 4 overdue are unassigned (fell through the cracks); rest have a tech
    const techId = i < 4 ? null : techRotate[idx % techRotate.length];
    addWO("ready_to_schedule", null, dueDate, null, null, null, techId, idx, undefined, undefined, undefined, undefined, undefined, OVERDUE_PRIORITIES[i]);
  }

  // On hold: 2
  for (let i = 0; i < 2; i++, idx++) {
    const scheduledDate = addDays(today, 2).toISOString().slice(0, 10);
    const techId = techRotate[idx % techRotate.length];
    addWO("on_hold", scheduledDate, scheduledDate, null, null, null, techId, idx);
  }

  // Hero records: 3 overdue (unassigned, high/urgent priority for demo insights)
  const HERO_OVERDUE_PRIORITIES = ["urgent", "urgent", "high"] as const;
  for (let i = 0; i < HERO_OVERDUE.length; i++, idx++) {
    const dueDate = addDays(today, -(2 + i)).toISOString().slice(0, 10);
    const hero = HERO_OVERDUE[i];
    // Intentionally unassigned — these are the overdue items that "fell through the cracks"
    addWO("ready_to_schedule", null, dueDate, null, null, null, null, idx, 60, hero.title, hero.description, undefined, undefined, HERO_OVERDUE_PRIORITIES[i]);
  }
  for (let i = 0; i < HERO_COMPLETED.length; i++, idx++) {
    const daysAgo = 2 + (i % 3);
    const sched = addDays(today, -daysAgo);
    const scheduledDate = sched.toISOString().slice(0, 10);
    const start = new Date(sched);
    start.setHours(9 + i, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const completedAt = new Date(end.getTime() + 10 * 60 * 1000).toISOString();
    const techId = techRotate[idx % techRotate.length];
    const hero = HERO_COMPLETED[i];
    addWO("completed", scheduledDate, scheduledDate, start.toISOString(), end.toISOString(), completedAt, techId, idx, 60, hero.title, hero.description, hero.completionNote, `Resolved: ${hero.completionNote}`);
  }
  for (let i = 0; i < HERO_IN_PROGRESS.length; i++, idx++) {
    const scheduledDate = todayISO();
    const slot = nextTodaySlot();
    const techId = slot && techList.length ? techList[(todaySlotIndex - 1) % techList.length] : techRotate[idx % techRotate.length];
    const hero = HERO_IN_PROGRESS[i];
    if (slot && techId) {
      addWO("in_progress", scheduledDate, scheduledDate, slot.start.toISOString(), slot.end.toISOString(), null, techId, idx, slot.durationMinutes, hero.title, hero.description);
    } else {
      addWO("in_progress", scheduledDate, scheduledDate, null, null, null, techId ?? null, idx, 60, hero.title, hero.description);
    }
  }
  return woBatch;
}

/** City-center coordinates for dispatch map (one per demo tenant). */
const DEMO_COORDINATES_BY_SLUG: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "summit-facility-demo": { latitude: 39.7392, longitude: -104.9903 },
  "northstar-manufacturing-demo": { latitude: 42.3314, longitude: -83.0458 },
  "riverside-schools-demo": { latitude: 33.9533, longitude: -117.3962 },
  "mercy-healthcare-demo": { latitude: 41.4993, longitude: -81.6944 },
};

/** Market-appropriate asset manufacturers for demo realism. */
function getManufacturerForAsset(tenantSlug: string, assetType: string, index: number): string {
  const bySlug: Record<string, Record<string, string[]>> = {
    "summit-facility-demo": {
      HVAC: ["Trane", "Carrier", "Lennox", "York"],
      Boiler: ["Cleaver-Brooks", "Weil-McLain", "Burnham"],
      Electrical: ["Eaton", "Square D", "Siemens"],
      Elevator: ["Otis", "ThyssenKrupp", "Kone"],
      "Fire Safety": ["Edwards", "Notifier", "Siemens"],
      Pump: ["Grundfos", "Taco", "Armstrong"],
      Fan: ["Greenheck", "Loren Cook", "Trane"],
      Lighting: ["Cree", "Philips", "Acuity"],
    },
    "northstar-manufacturing-demo": {
      Compressor: ["Ingersoll Rand", "Atlas Copco", "Kaeser"],
      Pump: ["Grundfos", "Gorman-Rupp", "Goulds"],
      Generator: ["Caterpillar", "Kohler", "Generac"],
      Boiler: ["Cleaver-Brooks", "Columbia", "Hurst"],
      Electrical: ["Eaton", "ABB", "Siemens"],
      HVAC: ["Trane", "Carrier", "York"],
      "Cooling Tower": ["BAC", "Evapco", "SPX"],
      "Air Handler": ["Trane", "Carrier", "Daikin"],
      Other: ["Various", "OEM", "Custom"],
    },
    "riverside-schools-demo": {
      HVAC: ["Trane", "Carrier", "Lennox"],
      Boiler: ["Weil-McLain", "Burnham", "Lochinvar"],
      "Fire Safety": ["Notifier", "Edwards", "Honeywell"],
      Electrical: ["Eaton", "Square D", "GE"],
      Plumbing: ["Kohler", "Sloan", "Zurn"],
      Lighting: ["Philips", "Cree", "Acuity"],
      Appliance: ["Hobart", "True", "Turbo Air"],
      Generator: ["Generac", "Kohler", "Briggs & Stratton"],
    },
    "mercy-healthcare-demo": {
      "Air Handler": ["Trane", "Carrier", "Johnson Controls"],
      HVAC: ["Trane", "Carrier", "Daikin"],
      Generator: ["Caterpillar", "Kohler", "Cummins"],
      Elevator: ["Otis", "ThyssenKrupp", "Kone"],
      "Cooling Tower": ["BAC", "Evapco"],
      Electrical: ["Eaton", "Siemens", "Schneider"],
      Lighting: ["Philips", "Cree", "Acuity"],
      Other: ["Various", "OEM", "Steris"],
    },
  };
  const market = bySlug[tenantSlug];
  if (!market) return "Demo Industrial";
  const list = market[assetType] ?? market["Other"] ?? ["Demo Industrial"];
  return list[index % list.length] ?? "Demo Industrial";
}

function getDemoAddress(propertyIndex: number, tenantSlug: string): {
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
} {
  const streets = ["100 Main St", "200 Oak Ave", "300 Industrial Blvd", "400 Campus Dr", "500 Commerce Way"];
  const bySlug: Record<string, { city: string; state: string; zip: string }> = {
    "summit-facility-demo": { city: "Denver", state: "CO", zip: "80202" },
    "northstar-manufacturing-demo": { city: "Detroit", state: "MI", zip: "48201" },
    "riverside-schools-demo": { city: "Riverside", state: "CA", zip: "92501" },
    "mercy-healthcare-demo": { city: "Cleveland", state: "OH", zip: "44101" },
  };
  const loc = bySlug[tenantSlug] ?? { city: "Anytown", state: "ST", zip: "00000" };
  const coords = DEMO_COORDINATES_BY_SLUG[tenantSlug];
  const latOffset = (propertyIndex % 5) * 0.008;
  const lonOffset = (propertyIndex % 5) * 0.01;
  return {
    address_line1: streets[propertyIndex % streets.length] ?? "100 Demo St",
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    latitude: coords ? coords.latitude + latOffset : null,
    longitude: coords ? coords.longitude + lonOffset : null,
  };
}

function backdateMonths(monthsAgo: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Dynamic date helpers (anchor around today for demo realism) ---
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday 00:00 of the week containing d (ISO weekday 1 = Monday). */
function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** Realistic maintenance work titles for demo (used in addition to config workOrderTitles). */
const REALISTIC_WO_TITLES = [
  "AHU filter replacement",
  "Rooftop unit belt inspection",
  "Pump lubrication",
  "Leaking sink repair",
  "Elevator inspection",
  "Fire alarm panel test",
  "Lighting ballast replacement",
  "Cooling tower inspection",
  "Boiler pressure check",
  "Door closer adjustment",
  "HVAC filter replacement",
  "RTU filter replacement",
  "Electrical panel inspection",
  "Exhaust fan bearing check",
  "Thermostat calibration",
];

/** Hero records for demos: detailed titles and descriptions. */
const HERO_OVERDUE: { title: string; description: string }[] = [
  { title: "AHU-2 vibration inspection and belt replacement", description: "Inspect AHU-2 for abnormal vibration; replace drive belt if worn. Document baseline readings." },
  { title: "Fire alarm panel trouble signal investigation", description: "Investigate intermittent trouble signal on main fire alarm panel. Check battery and zone wiring." },
  { title: "Cooling tower basin cleaning and inspection", description: "Clean cooling tower basin and strainers. Inspect for corrosion and biological growth." },
];
const HERO_COMPLETED: { title: string; description: string; completionNote: string }[] = [
  { title: "Elevator door sensor intermittent fault", description: "Diagnose and resolve intermittent door sensor fault on elevator #2.", completionNote: "Replaced door sensor, ran 20 cycles with no fault. Calibration verified." },
  { title: "Lighting ballast replacement - Warehouse A", description: "Replace failed ballasts in Warehouse A high-bay fixtures. Restore full illumination." , completionNote: "Replaced 4 ballasts. All fixtures operational. No flicker." },
  { title: "Boiler pressure check and relief valve test", description: "Annual boiler pressure check and relief valve test per safety requirements.", completionNote: "Pressure within spec. Relief valve tested and reseated. Logged in compliance record." },
];
const HERO_IN_PROGRESS: { title: string; description: string }[] = [
  { title: "Pump lubrication and seal inspection", description: "Lubricate bearings per schedule. Inspect mechanical seals for leakage." },
  { title: "Electrical panel thermal scan", description: "Thermal imaging scan of main electrical panel. Document hotspots and recommend follow-up." },
];

/** When tenant+company already exist, add products, technicians, work orders if missing, and backfill demo-quality fields. */
async function topUpTechniciansAndWorkOrders(
  supabase: SupabaseClient,
  cfg: DemoTenantConfig,
  tenantId: string,
  companyId: string
): Promise<void> {
  // Backfill demo-quality fields on existing records (idempotent: only where currently null)
  // 1) Properties: address where missing, and coordinates where missing (for dispatch map)
  const { data: companyPropsAddress } = await supabase
    .from("properties")
    .select("id, name")
    .eq("company_id", companyId)
    .is("address_line1", null)
    .order("name");
  const propsAddress = (companyPropsAddress ?? []) as { id: string; name: string }[];
  for (let i = 0; i < propsAddress.length; i++) {
    const addr = getDemoAddress(i, cfg.slug);
    await supabase
      .from("properties")
      .update({
        address_line1: addr.address_line1,
        address: addr.address_line1,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        postal_code: addr.zip,
        ...(addr.latitude != null && addr.longitude != null
          ? { latitude: addr.latitude, longitude: addr.longitude }
          : {}),
      })
      .eq("id", propsAddress[i].id);
  }
  const { data: companyPropsNoCoords } = await supabase
    .from("properties")
    .select("id, name")
    .eq("company_id", companyId)
    .or("latitude.is.null,longitude.is.null")
    .order("name");
  const propsNoCoords = (companyPropsNoCoords ?? []) as { id: string; name: string }[];
  for (let i = 0; i < propsNoCoords.length; i++) {
    const addr = getDemoAddress(i, cfg.slug);
    if (addr.latitude == null || addr.longitude == null) continue;
    await supabase
      .from("properties")
      .update({ latitude: addr.latitude, longitude: addr.longitude })
      .eq("id", propsNoCoords[i].id);
  }
  const { data: allPropIds } = await supabase
    .from("properties")
    .select("id")
    .eq("company_id", companyId);
  const propIdsForBld = ((allPropIds ?? []) as { id: string }[]).map((r) => r.id);
  // 2) Buildings: year_built etc where missing, and coordinates where missing (for dispatch map)
  let bldIds: string[] = [];
  if (propIdsForBld.length > 0) {
    const { data: companyBlds } = await supabase
      .from("buildings")
      .select("id")
      .in("property_id", propIdsForBld)
      .is("year_built", null);
    bldIds = ((companyBlds ?? []) as { id: string }[]).map((r) => r.id);
  }
  const coords = DEMO_COORDINATES_BY_SLUG[cfg.slug];
  for (let i = 0; i < bldIds.length; i++) {
    const bldLat =
      coords != null ? coords.latitude + (i % 5) * 0.008 + (i % 3) * 0.002 : null;
    const bldLon =
      coords != null ? coords.longitude + (i % 5) * 0.01 + (i % 3) * 0.002 : null;
    await supabase
      .from("buildings")
      .update({
        year_built: 1985 + (i % 35),
        floors: 1 + (i % 4),
        square_feet: 8000 + (i * 1500) % 45000,
        notes: "Demo building for CMMS.",
        ...(bldLat != null && bldLon != null
          ? { latitude: bldLat, longitude: bldLon }
          : {}),
      })
      .eq("id", bldIds[i]);
  }
  const { data: bldsNoCoords } = await supabase
    .from("buildings")
    .select("id")
    .in("property_id", propIdsForBld)
    .or("latitude.is.null,longitude.is.null");
  const bldIdsNoCoords = ((bldsNoCoords ?? []) as { id: string }[]).map((r) => r.id);
  for (let i = 0; i < bldIdsNoCoords.length; i++) {
    const bldLat =
      coords != null ? coords.latitude + (i % 5) * 0.008 + (i % 3) * 0.002 : null;
    const bldLon =
      coords != null ? coords.longitude + (i % 5) * 0.01 + (i % 3) * 0.002 : null;
    if (bldLat != null && bldLon != null) {
      await supabase
        .from("buildings")
        .update({ latitude: bldLat, longitude: bldLon })
        .eq("id", bldIdsNoCoords[i]);
    }
  }
  const { data: companyAssets } = await supabase
    .from("assets")
    .select("id")
    .eq("company_id", companyId);
  const assetIds = ((companyAssets ?? []) as { id: string }[]).map((r) => r.id);
  const conditions = ["excellent", "good", "good", "fair"] as const;
  for (let i = 0; i < assetIds.length; i++) {
    const { error } = await supabase
      .from("assets")
      .update({
        condition: conditions[i % conditions.length],
        description: "Demo asset. Installed for CMMS.",
        location_notes: "See building/unit for location.",
      })
      .eq("id", assetIds[i]);
    if (error && i === 0) console.warn("  Asset backfill update error:", error.message);
  }
  if (assetIds.length) console.log(`  Asset backfill: updated ${assetIds.length} assets (condition).`);
  const { data: completedWos } = await supabase
    .from("work_orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .is("completion_notes", null);
  for (let i = 0; i < (completedWos ?? []).length; i++) {
    const wo = (completedWos ?? [])[i] as { id: string };
    await supabase
      .from("work_orders")
      .update({
        completion_notes: COMPLETION_NOTES[i % COMPLETION_NOTES.length],
        resolution_summary: RESOLUTION_SUMMARIES[i % RESOLUTION_SUMMARIES.length],
      })
      .eq("id", wo.id);
  }
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, order_date")
    .eq("company_id", companyId)
    .is("expected_delivery_date", null);
  for (const po of (pos ?? []) as { id: string; order_date: string | null }[]) {
    if (po.order_date) {
      const d = new Date(po.order_date);
      d.setDate(d.getDate() + 7);
      await supabase
        .from("purchase_orders")
        .update({ expected_delivery_date: d.toISOString().slice(0, 10) })
        .eq("id", po.id);
    }
  }

  // Products + stock location + inventory balances (if missing)
  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if ((productCount ?? 0) === 0) {
    let defaultLocationId: string;
    const { data: existingLoc } = await supabase
      .from("stock_locations")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", "Main Warehouse")
      .maybeSingle();
    if (existingLoc?.id) {
      defaultLocationId = existingLoc.id as string;
    } else {
      const { data: sl } = await supabase
        .from("stock_locations")
        .insert({
          company_id: companyId,
          tenant_id: tenantId,
          name: "Main Warehouse",
          location_type: "warehouse",
          active: true,
          is_default: true,
        })
        .select("id")
        .single();
      defaultLocationId = (sl?.id as string) ?? "";
    }
    if (defaultLocationId) {
      const { data: vendorRows } = await supabase
        .from("vendors")
        .select("id")
        .eq("company_id", companyId);
      const topUpVendorIds = ((vendorRows ?? []) as { id: string }[]).map((r) => r.id);
      const productIdBySku = new Map<string, string>();
      for (let i = 0; i < cfg.products.length; i++) {
        const p = cfg.products[i];
        const defaultVendorId = topUpVendorIds.length ? topUpVendorIds[i % topUpVendorIds.length]! : null;
        const { data: prod } = await supabase
          .from("products")
          .insert({
            company_id: companyId,
            tenant_id: tenantId,
            name: p.name,
            sku: p.sku,
            category: p.category,
            unit_of_measure: p.unitOfMeasure,
            default_vendor_id: defaultVendorId,
            default_cost: getDefaultCostForProduct(p),
            reorder_point_default: getReorderPointDefaultForProduct(p),
            active: true,
          })
          .select("id, sku")
          .single();
        if (prod?.id && prod.sku) productIdBySku.set(prod.sku as string, prod.id as string);
      }
      const balanceRows = cfg.products
        .filter((p) => productIdBySku.has(p.sku))
        .map((p) => ({
          product_id: productIdBySku.get(p.sku)!,
          stock_location_id: defaultLocationId,
          tenant_id: tenantId,
          company_id: companyId,
          quantity_on_hand: p.defaultQuantity,
          minimum_stock: Math.max(2, Math.floor(p.defaultQuantity * 0.2)),
          reorder_point: Math.max(4, Math.floor(p.defaultQuantity * 0.35)),
        }));
      if (balanceRows.length) {
        await supabase.from("inventory_balances").upsert(balanceRows, {
          onConflict: "product_id,stock_location_id",
          ignoreDuplicates: false,
        });
      }
      console.log(`  Products added: ${productIdBySku.size}, balances: ${balanceRows.length}`);
    }
  }

  // Backfill default vendor, cost, reorder point on existing products missing them
  const { data: productsNeedingBackfill } = await supabase
    .from("products")
    .select("id, sku")
    .eq("company_id", companyId)
    .or("default_vendor_id.is.null,default_cost.is.null,reorder_point_default.is.null");
  const productsToBackfill = productsNeedingBackfill ?? [];
  if (productsToBackfill.length > 0) {
    const { data: vendorRows } = await supabase.from("vendors").select("id").eq("company_id", companyId);
    const backfillVendorIds = ((vendorRows ?? []) as { id: string }[]).map((r) => r.id);
    const skuToConfig = new Map(cfg.products.map((p) => [p.sku, p]));
    for (let i = 0; i < productsToBackfill.length; i++) {
      const row = productsToBackfill[i] as { id: string; sku: string | null };
      const p = row.sku ? skuToConfig.get(row.sku) : undefined;
      if (!p) continue;
      const defaultVendorId = backfillVendorIds.length ? backfillVendorIds[i % backfillVendorIds.length]! : null;
      await supabase
        .from("products")
        .update({
          default_vendor_id: defaultVendorId,
          default_cost: getDefaultCostForProduct(p),
          reorder_point_default: getReorderPointDefaultForProduct(p),
        })
        .eq("id", row.id);
    }
    console.log(`  Products backfilled (default vendor/cost/reorder): ${productsToBackfill.length}`);
  }

  const { data: existingTech } = await supabase
    .from("technicians")
    .select("id")
    .eq("company_id", companyId);
  let technicianIds: string[] = ((existingTech ?? []) as { id: string }[]).map((r) => r.id);

  if (technicianIds.length === 0) {
    // Leave email null so the ensure_technician_user trigger doesn't create auth.users from seed.
    const techRows = cfg.technicians.map((t) => {
      const noteParts: string[] = [];
      if (t.role) noteParts.push(`Role: ${t.role}.`);
      if (t.email) noteParts.push(`Contact: ${t.email}`);
      return {
        tenant_id: tenantId,
        company_id: companyId,
        name: t.name,
        technician_name: t.name,
        email: null as string | null,
        phone: t.phone,
        trade: t.trade,
        status: "active",
        notes: noteParts.length ? noteParts.join(" ") : null,
      };
    });
    const { data: techInsert, error: techErr } = await supabase
      .from("technicians")
      .insert(techRows)
      .select("id");
    if (techErr) {
      console.warn("  Technicians top-up warning:", techErr.message);
      // Continue to work orders with empty technician list (assigned_technician_id will be null)
    } else {
      technicianIds = ((techInsert ?? []) as { id: string }[]).map((r) => r.id);
      console.log(`  Technicians added: ${technicianIds.length}`);
    }
  } else {
    console.log(`  Technicians already present: ${technicianIds.length}`);
  }

  const { data: assets } = await supabase
    .from("assets")
    .select("id, property_id, building_id, unit_id")
    .eq("company_id", companyId);
  const allAssetIds = ((assets ?? []) as { id: string }[]).map((r) => r.id);
  const assetLocationById = new Map<
    string,
    { property_id: string | null; building_id: string | null; unit_id: string | null }
  >();
  for (const a of (assets ?? []) as { id: string; property_id: string | null; building_id: string | null; unit_id: string | null }[]) {
    if (a.property_id || a.building_id || a.unit_id) {
      assetLocationById.set(a.id, {
        property_id: a.property_id ?? null,
        building_id: a.building_id ?? null,
        unit_id: a.unit_id ?? null,
      });
    }
  }

  let defaultPropertyId: string | null = propIdsForBld[0] ?? null;
  let defaultBuildingId: string | null = bldIds[0] ?? null;
  if (!defaultBuildingId && propIdsForBld.length > 0) {
    const { data: firstBld } = await supabase
      .from("buildings")
      .select("id")
      .in("property_id", propIdsForBld)
      .limit(1)
      .maybeSingle();
    defaultBuildingId = (firstBld as { id: string } | null)?.id ?? null;
  }

  const { count: woCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if ((woCount ?? 0) > 0) {
    console.log("  Work orders already present; skip.");
    // Re-resolve coordinates for existing WOs so dispatch map shows jobs (trigger runs on property_id update)
    const { data: wosWithoutCoords } = await supabase
      .from("work_orders")
      .select("id, property_id")
      .eq("company_id", companyId)
      .is("latitude", null)
      .not("property_id", "is", null);
    for (const wo of (wosWithoutCoords ?? []) as { id: string; property_id: string }[]) {
      await supabase
        .from("work_orders")
        .update({ property_id: wo.property_id })
        .eq("id", wo.id);
    }
    if ((wosWithoutCoords?.length ?? 0) > 0) {
      console.log(`  Resolved coordinates for ${wosWithoutCoords!.length} work orders (dispatch map).`);
    }
    await ensureScenarioDataForTenant(supabase, tenantId, companyId);
    return;
  }

  const { data: vendorRows } = await supabase
    .from("vendors")
    .select("id")
    .eq("company_id", companyId);
  const vendorIds = ((vendorRows ?? []) as { id: string }[]).map((r) => r.id);

  const woPrefix = cfg.slug.replace(/-/g, "").slice(0, 3).toUpperCase();
  const woBatch = buildDemoWorkOrdersForTenant(
    tenantId,
    companyId,
    cfg,
    woPrefix,
    1000,
    technicianIds,
    allAssetIds,
    assetLocationById,
    vendorIds,
    defaultPropertyId,
    defaultBuildingId
  );
  for (let from = 0; from < woBatch.length; from += BATCH) {
    const { error: woErr } = await supabase
      .from("work_orders")
      .insert(woBatch.slice(from, from + BATCH));
    if (woErr) {
      console.error("  Work orders insert error:", woErr.message);
      return;
    }
  }
  console.log(`  Work orders added: ${woBatch.length}`);
  await ensureScenarioDataForTenant(supabase, tenantId, companyId);
}

async function ensureScenarioDataForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string
): Promise<void> {
  // Demo scenario wiring expects these exact values.
  const REQUEST_TITLES = ["HVAC not cooling – Building A", "Water leak – Room 204", "Lights out – Gym"] as const;
  const TECHNICIAN_NAMES = ["Mike Johnson", "Sarah Chen", "Luis Martinez"] as const;
  const DISPATCH_WO_TITLE = "HVAC not cooling – Building A";
  const COMPLETED_WO_TITLE = "Lights out – Gym";

  const ASSET_BY_NAME = {
    "RTU-3": { asset_type: "HVAC" },
    "Electrical Panel L2": { asset_type: "Electrical" },
    "Boiler System": { asset_type: "Boiler" },
  } as const;

  const today = todayISO();
  const now = new Date();
  const dueInDays = 2;
  const dueDate = addDays(new Date(`${today}T12:00:00`), dueInDays).toISOString().slice(0, 10);

  const completedAt = addDays(new Date(`${today}T12:00:00`), -1);
  const completedAtISO = completedAt.toISOString();

  const getFirstRowId = <T extends { id: string }>(rows: T[] | null | undefined): string | null =>
    (rows ?? []).length ? (rows[0] as T).id : null;

  async function getOrCreateTechnician(name: string, trade: string, phone: string): Promise<string | null> {
    // Scenario actions resolve technicians by `technician_name` and/or `name`.
    const { data: byTechName } = await supabase
      .from("technicians")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .eq("technician_name", name)
      .limit(1);

    const existingId = getFirstRowId((byTechName ?? []) as { id: string }[]);
    if (existingId) return existingId;

    const { data: byName } = await supabase
      .from("technicians")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .eq("name", name)
      .limit(1);
    const existingId2 = getFirstRowId((byName ?? []) as { id: string }[]);
    if (existingId2) return existingId2;

    const note = `Demo scenario technician (${trade}).`;
    const { data: created } = await supabase
      .from("technicians")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        name,
        technician_name: name,
        email: null,
        phone,
        trade,
        status: "active",
        notes: note,
      })
      .select("id")
      .single();

    return (created as { id?: string } | null)?.id ?? null;
  }

  async function getOrCreateAsset(
    assetName: string,
    assetType: string
  ): Promise<{ id: string; property_id: string | null; building_id: string | null; unit_id: string | null } | null> {
    const { data: byAssetName } = await supabase
      .from("assets")
      .select("id, property_id, building_id, unit_id")
      .eq("company_id", companyId)
      .eq("asset_name", assetName)
      .limit(1);

    const existing = (byAssetName ?? []) as { id: string; property_id: string | null; building_id: string | null; unit_id: string | null }[];
    const existingRow = existing[0] ?? null;
    if (existingRow?.id) return existingRow;

    const { data: byName } = await supabase
      .from("assets")
      .select("id, property_id, building_id, unit_id")
      .eq("company_id", companyId)
      .eq("name", assetName)
      .limit(1);
    const existingRow2 = ((byName ?? []) as typeof existing)[0] ?? null;
    if (existingRow2?.id) return existingRow2;

    const { data: defaultPropRows } = await supabase
      .from("properties")
      .select("id")
      .eq("company_id", companyId)
      .order("name")
      .limit(1);
    const defaultPropertyId = getFirstRowId((defaultPropRows ?? []) as { id: string }[]);

    const { data: defaultBldRows } = await supabase
      .from("buildings")
      .select("id, property_id")
      .eq("company_id", companyId)
      .order("name")
      .limit(1);
    const defaultBld = (defaultBldRows ?? []) as { id: string; property_id: string | null }[];
    const defaultBuildingId = defaultBld[0]?.id ?? null;

    const { data: unitRows } = defaultBuildingId
      ? await supabase.from("units").select("id").eq("building_id", defaultBuildingId).limit(1)
      : { data: [] as { id: string }[] };
    const defaultUnitId = getFirstRowId((unitRows ?? []) as { id: string }[]);

    const conditions = ["excellent", "good", "fair"] as const;
    const criticalities = ["low", "medium", "high"] as const;
    const condition = conditions[Math.floor(Math.random() * conditions.length)] ?? "good";
    const criticality = criticalities[Math.floor(Math.random() * criticalities.length)] ?? "medium";

    const manufacturerByType: Record<string, string> = {
      HVAC: "Trane",
      Electrical: "Eaton",
      Boiler: "Weil-McLain",
    };

    const serial = `SN-${assetName.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    const { data: created } = await supabase
      .from("assets")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        property_id: defaultPropertyId,
        building_id: defaultBuildingId,
        unit_id: defaultUnitId ?? undefined,
        name: assetName,
        asset_name: assetName,
        asset_type: assetType,
        status: "active",
        manufacturer: manufacturerByType[assetType] ?? "Demo Industrial",
        model: `M-${Math.floor(Math.random() * 900 + 100)}`,
        serial_number: serial,
        install_date: addDays(new Date(`${today}T12:00:00`), -365).toISOString().slice(0, 10),
        description: `Demo asset: ${assetName}`,
        location_notes: "Scenario top-up.",
        condition,
        criticality,
        notes: "Demo asset",
      })
      .select("id, property_id, building_id, unit_id")
      .single();

    return created
      ? (created as {
          id: string;
          property_id: string | null;
          building_id: string | null;
          unit_id: string | null;
        })
      : null;
  }

  async function getOrCreateWorkRequest(args: {
    title: string;
    assetId: string | null;
    assetName: string | null;
    assetLocation?: string | null;
    requesterIdx: number;
  }): Promise<string | null> {
    const { data: existing } = await supabase
      .from("work_requests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("description", args.title)
      .limit(1);
    const existingId = getFirstRowId((existing ?? []) as { id: string }[]);
    if (existingId) return existingId;

    const requester = DEMO_REQUESTERS[args.requesterIdx % DEMO_REQUESTERS.length];
    const { data: created } = await supabase
      .from("work_requests")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        requester_name: requester.name,
        requester_email: requester.email,
        location: args.assetLocation ?? "Demo location",
        description: args.title,
        priority: "medium",
        status: "submitted",
        asset_id: args.assetId,
        created_at: now.toISOString(),
      })
      .select("id")
      .single();
    return (created as { id?: string } | null)?.id ?? null;
  }

  async function getOrCreateWorkOrder(args: {
    title: string;
    status: (typeof WO_STATUSES)[number];
    requestId: string | null;
    assetId: string | null;
    technicianId: string | null;
    scheduledDate: string | null;
    scheduledStartISO: string | null;
    scheduledEndISO: string | null;
    dueDate: string | null;
    completionNotes: string | null;
    resolutionSummary: string | null;
    completedAtISO: string | null;
    assignedTechForCompleted: string | null;
  }): Promise<string | null> {
    const { data: existingRows } = await supabase
      .from("work_orders")
      .select("id, asset_id, assigned_technician_id, status, scheduled_date")
      .eq("tenant_id", tenantId)
      .eq("title", args.title)
      .order("created_at", { ascending: false })
      .limit(1);

    const existing = (existingRows ?? []) as { id: string; asset_id: string | null; assigned_technician_id: string | null; status: string; scheduled_date: string | null }[];
    const existingWo = existing[0] ?? null;

    const woId = existingWo?.id ?? null;
    const tenantCompanyKey = companyId.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase();
    const titleKey = args.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 14).toUpperCase();
    const woNumber = `WO-DEMO-${tenantCompanyKey}-${titleKey}`;

    // Pull property/building/unit from the asset if possible; otherwise leave as null.
    const assetId = args.assetId;
    const { data: assetLocRows } = assetId
      ? await supabase
          .from("assets")
          .select("property_id, building_id, unit_id")
          .eq("id", assetId)
          .limit(1)
      : { data: [] as { property_id: string | null; building_id: string | null; unit_id: string | null }[] };
    const assetLoc = (assetLocRows ?? []) as { property_id: string | null; building_id: string | null; unit_id: string | null }[];

    const propertyId = assetLoc[0]?.property_id ?? null;
    const buildingId = assetLoc[0]?.building_id ?? null;
    const unitId = assetLoc[0]?.unit_id ?? null;

    const basePayload = {
      tenant_id: tenantId,
      company_id: companyId,
      work_order_number: woNumber,
      title: args.title,
      description: `Demo work order: ${args.title}`,
      status: args.status,
      priority: args.status === "completed" ? "medium" : "high",
      category: "repair",
      source_type: "manual",
      asset_id: assetId,
      property_id: propertyId,
      building_id: buildingId,
      unit_id: unitId ?? null,
      request_id: args.requestId,
      assigned_technician_id: args.technicianId,
      assigned_crew_id: null,
      requested_by_name: "Maintenance Lead",
      requested_by_email: "maint@demo.local",
      requested_at: now.toISOString(),
      scheduled_date: args.scheduledDate,
      due_date: args.dueDate,
      scheduled_start: args.scheduledStartISO,
      scheduled_end: args.scheduledEndISO,
      completed_at: args.completedAtISO,
      completion_notes: args.completionNotes,
      resolution_summary: args.resolutionSummary,
      completed_by_technician_id: args.status === "completed" ? args.assignedTechForCompleted : null,
      vendor_id: null,
      estimated_hours: 1,
      actual_hours: args.status === "completed" ? 1 : null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    if (woId) {
      await supabase.from("work_orders").update(basePayload).eq("id", woId);
      return woId;
    }

    const { data: created } = await supabase
      .from("work_orders")
      .insert(basePayload)
      .select("id")
      .single();

    return (created as { id?: string } | null)?.id ?? null;
  }

  const techByName = new Map<string, string | null>();
  techByName.set("Mike Johnson", await getOrCreateTechnician("Mike Johnson", "HVAC", "(555) 401-1001"));
  techByName.set("Sarah Chen", await getOrCreateTechnician("Sarah Chen", "Electrical", "(555) 401-1002"));
  techByName.set("Luis Martinez", await getOrCreateTechnician("Luis Martinez", "Plumbing", "(555) 401-1003"));

  const [rtu3, electricalPanel, boilerSystem] = await Promise.all([
    getOrCreateAsset("RTU-3", ASSET_BY_NAME["RTU-3"].asset_type),
    getOrCreateAsset("Electrical Panel L2", ASSET_BY_NAME["Electrical Panel L2"].asset_type),
    getOrCreateAsset("Boiler System", ASSET_BY_NAME["Boiler System"].asset_type),
  ]);

  const dispatchRequestId = await getOrCreateWorkRequest({
    title: REQUEST_TITLES[0],
    assetId: rtu3?.id ?? null,
    assetName: "RTU-3",
    assetLocation: "Building A / Roof",
    requesterIdx: 0,
  });

  await getOrCreateWorkRequest({
    title: REQUEST_TITLES[1],
    assetId: boilerSystem?.id ?? null,
    assetName: "Boiler System",
    assetLocation: "Room 204 / Mechanical Room",
    requesterIdx: 1,
  });

  await getOrCreateWorkRequest({
    title: REQUEST_TITLES[2],
    assetId: electricalPanel?.id ?? null,
    assetName: "Electrical Panel L2",
    assetLocation: "Gym / Electrical Room",
    requesterIdx: 2,
  });

  // Dispatch + execution anchor work order (Step 3–5).
  const scheduledStart = new Date(`${today}T12:00:00`);
  scheduledStart.setHours(8, 30, 0, 0);
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);
  await getOrCreateWorkOrder({
    title: DISPATCH_WO_TITLE,
    status: "in_progress",
    requestId: dispatchRequestId,
    assetId: rtu3?.id ?? null,
    technicianId: techByName.get("Mike Johnson") ?? null,
    scheduledDate: today,
    scheduledStartISO: scheduledStart.toISOString(),
    scheduledEndISO: scheduledEnd.toISOString(),
    dueDate,
    completionNotes: null,
    resolutionSummary: null,
    completedAtISO: null,
    assignedTechForCompleted: null,
  });

  // Completed work order (Step 6–7). Intentionally do NOT link via `request_id` to avoid
  // breaking the step-3 anchor if the demo request row picked is "Lights out – Gym".
  const { data: completedExisting } = await supabase
    .from("work_orders")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("title", COMPLETED_WO_TITLE)
    .order("created_at", { ascending: false })
    .limit(1);
  const completedExistingStatus = ((completedExisting ?? []) as { status?: string | null }[])[0]?.status ?? null;

  const scheduledStart2 = new Date(`${today}T12:00:00`);
  scheduledStart2.setHours(10, 0, 0, 0);
  const scheduledEnd2 = new Date(scheduledStart2.getTime() + 60 * 60 * 1000);

  const scheduledStart2ISO = scheduledStart2.toISOString();
  const scheduledEnd2ISO = scheduledEnd2.toISOString();
  const assignedSarahId = techByName.get("Sarah Chen") ?? null;

  if (completedExistingStatus === "completed") {
    // Update fields but keep status stable (avoids extra status-history rows).
    await getOrCreateWorkOrder({
      title: COMPLETED_WO_TITLE,
      status: "completed",
      requestId: null,
      assetId: electricalPanel?.id ?? null,
      technicianId: assignedSarahId,
      scheduledDate: null,
      scheduledStartISO: null,
      scheduledEndISO: null,
      dueDate: null,
      completionNotes: "Restored power to the gym circuit and verified stable operation.",
      resolutionSummary: "Resolved: repair completed successfully.",
      completedAtISO: completedAtISO,
      assignedTechForCompleted: assignedSarahId,
    });
  } else {
    // Two-step status progression so the UI shows meaningful history.
    await getOrCreateWorkOrder({
      title: COMPLETED_WO_TITLE,
      status: "in_progress",
      requestId: null,
      assetId: electricalPanel?.id ?? null,
      technicianId: assignedSarahId,
      scheduledDate: today,
      scheduledStartISO: scheduledStart2ISO,
      scheduledEndISO: scheduledEnd2ISO,
      dueDate,
      completionNotes: null,
      resolutionSummary: null,
      completedAtISO: null,
      assignedTechForCompleted: null,
    });
    await getOrCreateWorkOrder({
      title: COMPLETED_WO_TITLE,
      status: "completed",
      requestId: null,
      assetId: electricalPanel?.id ?? null,
      technicianId: assignedSarahId,
      scheduledDate: null,
      scheduledStartISO: null,
      scheduledEndISO: null,
      dueDate: null,
      completionNotes: "Restored power to the gym circuit and verified stable operation.",
      resolutionSummary: "Resolved: repair completed successfully.",
      completedAtISO: completedAtISO,
      assignedTechForCompleted: assignedSarahId,
    });
  }
}

export async function seedTenant(
  supabase: SupabaseClient,
  cfg: DemoTenantConfig
): Promise<void> {
  // 1) Tenant + Company (idempotent by slug; fallback match by name so we target the same tenant the user sees)
  let { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", cfg.slug)
    .maybeSingle();
  if (!existingTenant?.id) {
    const { data: byName } = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("name", cfg.tenantName)
      .maybeSingle();
    if (byName?.id) {
      existingTenant = { id: byName.id };
      if (!byName.slug || byName.slug.trim() === "") {
        await supabase.from("tenants").update({ slug: cfg.slug }).eq("id", byName.id);
      }
    }
  }
  let tenantId: string;
  if (existingTenant?.id) {
    tenantId = existingTenant.id as string;
  } else {
    const { data: t, error: te } = await supabase
      .from("tenants")
      .insert({ name: cfg.tenantName, slug: cfg.slug })
      .select("id")
      .single();
    if (te || !t?.id) throw new Error("Failed to create tenant: " + (te?.message ?? "no id"));
    tenantId = t.id as string;
  }

  const companyProfileFields = cfg.companyProfile
    ? {
        address: `${cfg.companyProfile.addressLine1}, ${cfg.companyProfile.city}, ${cfg.companyProfile.state} ${cfg.companyProfile.zip}`,
        phone: cfg.companyProfile.phone,
        website: cfg.companyProfile.website,
      }
    : {};
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", cfg.companyName)
    .maybeSingle();
  let companyId: string;
  if (existingCompany?.id) {
    companyId = existingCompany.id as string;
    console.log("  Tenant and company already exist; ensuring technicians and work orders.");
    await supabase
      .from("companies")
      .update({
        legal_name: cfg.companyName,
        company_code: cfg.slug.replace(/-/g, "").slice(0, 8).toUpperCase(),
        primary_contact_name: "Operations",
        primary_contact_email: "ops@demo.local",
        ...companyProfileFields,
      })
      .eq("id", companyId);
    await topUpTechniciansAndWorkOrders(supabase, cfg, tenantId, companyId);
    return;
  } else {
    const companyCode = cfg.slug.replace(/-/g, "").slice(0, 8).toUpperCase();
    const { data: c, error: ce } = await supabase
      .from("companies")
      .insert({
        name: cfg.companyName,
        tenant_id: tenantId,
        status: "active",
        legal_name: cfg.companyName,
        company_code: companyCode,
        primary_contact_name: "Operations",
        primary_contact_email: "ops@demo.local",
        ...companyProfileFields,
      })
      .select("id")
      .single();
    if (ce || !c?.id) throw new Error("Failed to create company: " + (ce?.message ?? "no id"));
    companyId = c.id as string;
  }

  // 2) Properties, buildings, units
  const propertyIdByKey = new Map<string, string>();
  const buildingIdByKey = new Map<string, string>();
  const unitIdByKey = new Map<string, string>();
  const unitIdsByBuildingId = new Map<string, string[]>();
  for (let propIdx = 0; propIdx < cfg.locations.length; propIdx++) {
    const loc = cfg.locations[propIdx];
    const addr = getDemoAddress(propIdx, cfg.slug);
    const { data: prop } = await supabase
      .from("properties")
      .insert({
        company_id: companyId,
        name: loc.propertyName,
        property_name: loc.propertyName,
        status: "active",
        address_line1: addr.address_line1,
        address: addr.address_line1,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        postal_code: addr.zip,
        ...(addr.latitude != null && addr.longitude != null
          ? { latitude: addr.latitude, longitude: addr.longitude }
          : {}),
      })
      .select("id")
      .single();
    if (!prop?.id) continue;
    const pid = prop.id as string;
    propertyIdByKey.set(loc.propertyName, pid);
    let bldIdx = 0;
    for (const bld of loc.buildings) {
      const yearBuilt = 1985 + (propIdx * 3 + bldIdx) % 35;
      const floors = 1 + (bldIdx % 4);
      const squareFeet = 8000 + (propIdx * 2000 + bldIdx * 1500) % 45000;
      const bldLat =
        addr.latitude != null ? addr.latitude + (bldIdx + 1) * 0.002 : null;
      const bldLon =
        addr.longitude != null ? addr.longitude + (bldIdx + 1) * 0.002 : null;
      const { data: building } = await supabase
        .from("buildings")
        .insert({
          property_id: pid,
          tenant_id: tenantId,
          name: bld.name,
          building_name: bld.name,
          status: "active",
          year_built: yearBuilt,
          floors,
          square_feet: squareFeet,
          notes: "Demo building for CMMS.",
          ...(bldLat != null && bldLon != null
            ? { latitude: bldLat, longitude: bldLon }
            : {}),
        })
        .select("id")
        .single();
      if (!building?.id) continue;
      const bid = building.id as string;
      buildingIdByKey.set(`${loc.propertyName}::${bld.name}`, bid);
      const unitIds: string[] = [];
      for (const unitName of bld.units ?? []) {
        const { data: unit } = await supabase
          .from("units")
          .insert({
            building_id: bid,
            property_id: pid,
            tenant_id: tenantId,
            name_or_number: unitName,
            unit_name: unitName,
            status: "active",
          })
          .select("id")
          .single();
        if (unit?.id) {
          unitIdByKey.set(`${bid}::${unitName}`, unit.id as string);
          unitIds.push(unit.id as string);
        }
      }
      if (unitIds.length) unitIdsByBuildingId.set(bid, unitIds);
      bldIdx++;
    }
  }
  const buildingIds = Array.from(buildingIdByKey.values());
  console.log(`  Locations: ${propertyIdByKey.size} properties, ${buildingIds.length} buildings`);

  // 3) Technicians (email null so ensure_technician_user trigger doesn't create auth.users from seed)
  const techRows = cfg.technicians.map((t) => {
    const noteParts: string[] = [];
    if (t.role) noteParts.push(`Role: ${t.role}.`);
    if (t.email) noteParts.push(`Contact: ${t.email}`);
    return {
      tenant_id: tenantId,
      company_id: companyId,
      name: t.name,
      technician_name: t.name,
      email: null as string | null,
      phone: t.phone,
      trade: t.trade,
      status: "active",
      notes: noteParts.length ? noteParts.join(" ") : null,
    };
  });
  const { data: techInsert, error: techErr } = await supabase.from("technicians").insert(techRows).select("id");
  if (techErr) console.warn("  Technicians insert warning:", techErr.message);
  const technicianIds = ((techInsert ?? []) as { id: string }[]).map((r) => r.id);
  console.log(`  Technicians: ${technicianIds.length}`);

  // 4) Vendors
  const vendorRows = cfg.vendors.map((v) => ({
    company_id: companyId,
    name: v.name,
    contact_name: v.contactName,
    email: v.email,
    phone: v.phone,
    service_type: v.serviceType,
    website: `https://${v.name.toLowerCase().replace(/\s+/g, "")}.demo`,
  }));
  const { data: vendorInsert } = await supabase.from("vendors").insert(vendorRows).select("id");
  const vendorIds = ((vendorInsert ?? []) as { id: string }[]).map((r) => r.id);
  console.log(`  Vendors: ${vendorIds.length}`);

  // 5) Stock location
  const { data: sl } = await supabase
    .from("stock_locations")
    .insert({
      company_id: companyId,
      tenant_id: tenantId,
      name: "Main Warehouse",
      location_type: "warehouse",
      active: true,
      is_default: true,
    })
    .select("id")
    .single();
  const defaultLocationId = (sl?.id as string) ?? "";
  if (!defaultLocationId) throw new Error("Failed to create stock location");

  // 6) Products + inventory_balances
  const productIdBySku = new Map<string, string>();
  for (let i = 0; i < cfg.products.length; i++) {
    const p = cfg.products[i];
    const defaultVendorId = vendorIds.length ? vendorIds[i % vendorIds.length]! : null;
    const { data: prod } = await supabase
      .from("products")
      .insert({
        company_id: companyId,
        tenant_id: tenantId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit_of_measure: p.unitOfMeasure,
        default_vendor_id: defaultVendorId,
        default_cost: getDefaultCostForProduct(p),
        reorder_point_default: getReorderPointDefaultForProduct(p),
        active: true,
      })
      .select("id, sku")
      .single();
    if (prod?.id && prod.sku) productIdBySku.set(prod.sku as string, prod.id as string);
  }
  const balanceRows = cfg.products
    .filter((p) => productIdBySku.has(p.sku))
    .map((p) => ({
      product_id: productIdBySku.get(p.sku)!,
      stock_location_id: defaultLocationId,
      quantity_on_hand: p.defaultQuantity,
      minimum_stock: Math.max(2, Math.floor(p.defaultQuantity * 0.2)),
      reorder_point: Math.max(4, Math.floor(p.defaultQuantity * 0.35)),
    }));
  if (balanceRows.length) {
    await supabase.from("inventory_balances").upsert(balanceRows, {
      onConflict: "product_id,stock_location_id",
      ignoreDuplicates: false,
    });
  }
  console.log(`  Products: ${productIdBySku.size}, balances: ${balanceRows.length}`);

  // 7) Category images (one per asset type)
  const assetTypes = [...new Set(cfg.assetPatterns.map((a) => a.type))];
  const imageUrlByType: Record<string, string> = {};
  for (const type of assetTypes) {
    try {
      const query = getPexelsQueryForAssetType(type);
      const url = await fetchPexelsImage(query);
      if (url) imageUrlByType[type] = url;
    } catch {
      // continue
    }
  }
  console.log(`  Category images: ${Object.keys(imageUrlByType).length} types`);

  // 8) Assets (condition, criticality, description, unit_id; build assetLocationById for WOs and PM)
  const assetIdByKey = new Map<string, string>();
  const assetLocationById = new Map<
    string,
    { property_id: string; building_id: string; unit_id: string | null }
  >();
  const buildingAssetCount = new Map<string, number>();
  let assetIndex = 0;
  const conditions = ["excellent", "good", "good", "fair"] as const;
  const criticalities = ["low", "medium", "medium", "high", "critical"] as const;
  for (const loc of cfg.locations) {
    for (const bld of loc.buildings) {
      const bid = buildingIdByKey.get(`${loc.propertyName}::${bld.name}`);
      const pid = propertyIdByKey.get(loc.propertyName);
      if (!bid || !pid) continue;
      for (const pat of cfg.assetPatterns) {
        for (let n = 1; n <= pat.countPerBuilding; n++) {
          const name = `${pat.namePrefix}-${n}`;
          const key = `${bid}::${name}`;
          const countInBld = buildingAssetCount.get(bid) ?? 0;
          buildingAssetCount.set(bid, countInBld + 1);
          const unitIds = unitIdsByBuildingId.get(bid);
          const unit_id =
            unitIds?.length ? (unitIds[countInBld % unitIds.length] ?? null) : null;
          const { data: ast } = await supabase
            .from("assets")
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              property_id: pid,
              building_id: bid,
              unit_id: unit_id ?? undefined,
              name,
              asset_name: name,
              asset_type: pat.type,
              status: "active",
              manufacturer: getManufacturerForAsset(cfg.slug, pat.type, assetIndex),
              model: `M-${String(assetIndex + 1).padStart(3, "0")}`,
              serial_number: `SN-${cfg.slug.slice(0, 4).toUpperCase()}-${assetIndex + 1}`,
              install_date: backdateMonths(randomInRange(12, 36)).toISOString().slice(0, 10),
              description: `${pat.type} asset ${name}. Installed for demo.`,
              location_notes: unit_id ? "See unit for exact location." : "Building-level asset.",
              condition: conditions[assetIndex % conditions.length],
              criticality: criticalities[assetIndex % criticalities.length],
              notes: "Demo asset",
              ...(imageUrlByType[pat.type] ? { image_url: imageUrlByType[pat.type] } : {}),
            })
            .select("id")
            .single();
          if (ast?.id) {
            const aid = ast.id as string;
            assetIdByKey.set(key, aid);
            assetLocationById.set(aid, {
              property_id: pid,
              building_id: bid,
              unit_id,
            });
            assetIndex++;
          }
        }
      }
    }
  }
  const allAssetIds = Array.from(assetIdByKey.values());
  console.log(`  Assets: ${allAssetIds.length}`);

  // 9) Sub-assets (manufacturer, model, serial for realism)
  const parentCandidates = allAssetIds.slice(0, Math.min(15, allAssetIds.length));
  let subIdx = 0;
  for (let i = 0; i < Math.min(5, parentCandidates.length); i++) {
    const parentId = parentCandidates[i];
    const childNames = ["Compressor", "Fan Motor", "Control Module"];
    for (const childName of childNames) {
      subIdx++;
      await supabase.from("assets").insert({
        tenant_id: tenantId,
        company_id: companyId,
        parent_asset_id: parentId,
        name: childName,
        asset_name: childName,
        asset_type: "Component",
        status: "active",
        manufacturer: "Demo Components",
        model: `CM-${String(subIdx).padStart(2, "0")}`,
        serial_number: `SN-SUB-${cfg.slug.slice(0, 3).toUpperCase()}-${subIdx}`,
        notes: "Demo sub-asset",
        ...(imageUrlByType["Component"] ? { image_url: imageUrlByType["Component"] } : {}),
      });
    }
  }
  console.log("  Sub-assets: added");

  // 10) PM templates (description, instructions, estimated_duration_minutes)
  const templateIdByName = new Map<string, string>();
  for (const tmpl of cfg.pmTemplateNames) {
    const freqInterval = tmpl.frequency === "weekly" ? 1 : tmpl.frequency === "monthly" ? 1 : tmpl.frequency === "annual" ? 1 : 3;
    const freqType = tmpl.frequency === "weekly" ? "weekly" : tmpl.frequency === "monthly" ? "monthly" : tmpl.frequency === "annual" ? "yearly" : "quarterly";
    const estMins = tmpl.frequency === "weekly" ? 30 : tmpl.frequency === "monthly" ? 45 : tmpl.frequency === "annual" ? 90 : 60;
    const { data: pt } = await supabase
      .from("preventive_maintenance_templates")
      .insert({
        company_id: companyId,
        name: tmpl.name,
        frequency_type: freqType,
        frequency_interval: freqInterval,
        priority: "medium",
        description: `Scheduled ${tmpl.frequency} task: ${tmpl.name}.`,
        instructions: `1. Verify asset is accessible. 2. Complete checklist. 3. Record readings. 4. Note any defects. 5. Sign off.`,
        estimated_duration_minutes: estMins,
      })
      .select("id, name")
      .single();
    if (pt?.id && pt.name) templateIdByName.set(pt.name as string, pt.id as string);
  }
  const templateIds = Array.from(templateIdByName.values());

  // 11) PM plans (description, instructions, assigned tech, location from asset, estimated_duration)
  // Dynamic next_run_date: some overdue, some today, some next 7 days, some 8–30 days
  const planAssetIds = allAssetIds.slice(0, Math.min(30, allAssetIds.length));
  const todayStr = todayISO();
  for (let i = 0; i < Math.min(25, planAssetIds.length); i++) {
    const assetId = planAssetIds[i];
    const loc = assetLocationById.get(assetId);
    const templateId = templateIds[i % templateIds.length] ?? null;
    let nextRunDate: string;
    if (i % 5 === 0) {
      nextRunDate = addDays(new Date(todayStr + "T12:00:00"), -(2 + (i % 4))).toISOString().slice(0, 10);
    } else if (i % 5 === 1) {
      nextRunDate = todayStr;
    } else if (i % 5 === 2) {
      nextRunDate = addDays(new Date(todayStr + "T12:00:00"), 1 + (i % 6)).toISOString().slice(0, 10);
    } else {
      nextRunDate = addDays(new Date(todayStr + "T12:00:00"), 8 + (i % 23)).toISOString().slice(0, 10);
    }
    const startDate = addDays(new Date(todayStr + "T12:00:00"), -90);
    await supabase.from("preventive_maintenance_plans").insert({
      tenant_id: tenantId,
      company_id: companyId,
      asset_id: assetId,
      property_id: loc?.property_id ?? null,
      building_id: loc?.building_id ?? null,
      unit_id: loc?.unit_id ?? null,
      template_id: templateId,
      name: `PM-${i + 1}`,
      description: `Preventive maintenance plan for asset.`,
      instructions: "Follow template checklist. Record all readings. Report defects.",
      frequency_type: "monthly",
      frequency_interval: 1,
      start_date: startDate.toISOString().slice(0, 10),
      next_run_date: nextRunDate,
      auto_create_work_order: true,
      priority: "medium",
      status: "active",
      assigned_technician_id: technicianIds[i % technicianIds.length] ?? null,
      estimated_duration_minutes: 30 + (i % 3) * 15,
    });
  }
  console.log("  PM plans: added");

  // 12) Work orders (dynamic dates around today; realistic status mix; full current week for dispatch)
  const woPrefix = cfg.slug.replace(/-/g, "").slice(0, 3).toUpperCase();
  const defaultPropertyId = buildingIds.length > 0 ? [...propertyIdByKey.values()][0] ?? null : null;
  const defaultBuildingId = buildingIds[0] ?? null;
  const woBatch = buildDemoWorkOrdersForTenant(
    tenantId,
    companyId,
    cfg,
    woPrefix,
    1000,
    technicianIds,
    allAssetIds,
    assetLocationById,
    vendorIds,
    defaultPropertyId,
    defaultBuildingId
  );
  for (let from = 0; from < woBatch.length; from += BATCH) {
    await supabase.from("work_orders").insert(woBatch.slice(from, from + BATCH));
  }
  console.log(`  Work orders: ${woBatch.length}`);

  // 12b) PM runs + PM-sourced completed WOs so PM Compliance Engine shows on-time, late, missed
  const todayStrPm = todayISO();
  const { data: overduePlans } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, next_run_date, asset_id, assigned_technician_id, property_id, building_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .lt("next_run_date", todayStrPm)
    .order("next_run_date", { ascending: true })
    .limit(10);
  const plans = (overduePlans ?? []) as { id: string; next_run_date: string | null; asset_id: string | null; assigned_technician_id: string | null; property_id: string | null; building_id: string | null }[];
  for (const plan of plans) {
    const scheduledDate = plan.next_run_date ?? todayStrPm;
    const { data: runRow } = await supabase
      .from("preventive_maintenance_runs")
      .insert({
        preventive_maintenance_plan_id: plan.id,
        scheduled_date: scheduledDate,
        status: "pending",
      })
      .select("id")
      .single();
    if (!runRow?.id) continue;
    const runId = runRow.id as string;
    const idxRun = plans.indexOf(plan);
    if (idxRun < 3) {
      const completedAt = new Date(`${scheduledDate}T10:00:00`);
      const { data: woRow } = await supabase
        .from("work_orders")
        .insert({
          tenant_id: tenantId,
          company_id: companyId,
          work_order_number: `WO-${woPrefix}-PM-${idxRun + 1}`,
          title: `PM task (on time) – ${scheduledDate}`,
          description: "Preventive maintenance completed by scheduled date.",
          status: "completed",
          priority: "medium",
          category: "preventive_maintenance",
          source_type: "preventive_maintenance",
          preventive_maintenance_plan_id: plan.id,
          preventive_maintenance_run_id: runId,
          asset_id: plan.asset_id,
          property_id: plan.property_id,
          building_id: plan.building_id,
          assigned_technician_id: plan.assigned_technician_id,
          completed_by_technician_id: plan.assigned_technician_id,
          due_date: scheduledDate,
          scheduled_date: scheduledDate,
          completed_at: completedAt.toISOString(),
          completion_notes: "PM completed on scheduled date. All checks passed.",
          resolution_summary: "Resolved: PM completed on time.",
          estimated_hours: 0.75,
          actual_hours: 0.75,
          requested_by_name: "System",
          requested_by_email: "pm@demo.local",
          requested_at: new Date(`${scheduledDate}T08:00:00`).toISOString(),
          created_at: new Date(`${scheduledDate}T08:00:00`).toISOString(),
          updated_at: completedAt.toISOString(),
        })
        .select("id")
        .single();
      if (woRow?.id) {
        await supabase.from("preventive_maintenance_runs").update({ generated_work_order_id: woRow.id, status: "generated" }).eq("id", runId);
      }
    } else if (idxRun < 6) {
      const completedAt = new Date(`${scheduledDate}T10:00:00`);
      completedAt.setDate(completedAt.getDate() + 2);
      const { data: woRow } = await supabase
        .from("work_orders")
        .insert({
          tenant_id: tenantId,
          company_id: companyId,
          work_order_number: `WO-${woPrefix}-PM-Late-${idxRun - 2}`,
          title: `PM task (completed late) – ${scheduledDate}`,
          description: "Preventive maintenance completed after scheduled date.",
          status: "completed",
          priority: "medium",
          category: "preventive_maintenance",
          source_type: "preventive_maintenance",
          preventive_maintenance_plan_id: plan.id,
          preventive_maintenance_run_id: runId,
          asset_id: plan.asset_id,
          property_id: plan.property_id,
          building_id: plan.building_id,
          assigned_technician_id: plan.assigned_technician_id,
          completed_by_technician_id: plan.assigned_technician_id,
          due_date: scheduledDate,
          scheduled_date: scheduledDate,
          completed_at: completedAt.toISOString(),
          completion_notes: "PM completed two days after scheduled date due to parts delay.",
          resolution_summary: "Resolved: PM completed late.",
          estimated_hours: 0.75,
          actual_hours: 0.75,
          requested_by_name: "System",
          requested_by_email: "pm@demo.local",
          requested_at: new Date(`${scheduledDate}T08:00:00`).toISOString(),
          created_at: new Date(`${scheduledDate}T08:00:00`).toISOString(),
          updated_at: completedAt.toISOString(),
        })
        .select("id")
        .single();
      if (woRow?.id) {
        await supabase.from("preventive_maintenance_runs").update({ generated_work_order_id: woRow.id, status: "generated" }).eq("id", runId);
      }
    }
  }
  if (plans.length > 0) console.log(`  PM runs: ${plans.length} (on-time/late/missed for compliance)`);

  // 12c) Backfill assets.last_serviced_at from completed work orders
  const { data: completedByAsset } = await supabase
    .from("work_orders")
    .select("asset_id, completed_at")
    .eq("company_id", companyId)
    .eq("status", "completed")
    .not("asset_id", "is", null);
  const latestByAsset = new Map<string, string>();
  for (const row of (completedByAsset ?? []) as { asset_id: string; completed_at: string }[]) {
    const at = row.completed_at?.slice(0, 10);
    if (!at) continue;
    const cur = latestByAsset.get(row.asset_id);
    if (!cur || at > cur) latestByAsset.set(row.asset_id, at);
  }
  for (const [assetId, lastDate] of latestByAsset) {
    await supabase.from("assets").update({ last_serviced_at: `${lastDate}T12:00:00Z` }).eq("id", assetId);
  }
  if (latestByAsset.size > 0) console.log(`  Asset last_serviced_at: ${latestByAsset.size} updated`);

  // 13) Work requests (some linked to asset; location text; created_at spread over last 2 months so demo feels active)
  const todayReq = new Date(todayISO() + "T12:00:00");
  const requestBatch = cfg.requestTitles.slice(0, 15).map((title, i) => {
    const daysAgo = 3 + (i * 5) % 58;
    const created = addDays(todayReq, -daysAgo);
    return {
      tenant_id: tenantId,
      company_id: companyId,
      requester_name: DEMO_REQUESTERS[i % DEMO_REQUESTERS.length].name,
      requester_email: DEMO_REQUESTERS[i % DEMO_REQUESTERS.length].email,
      location: i % 3 === 0 ? "Main building" : i % 3 === 1 ? "North wing" : "Mechanical room",
      description: title,
      priority: i % 3 === 0 ? "high" : "medium",
      status: i % 4 === 0 ? "converted_to_work_order" : "submitted",
      asset_id: allAssetIds.length ? allAssetIds[i % allAssetIds.length] ?? null : null,
      created_at: created.toISOString(),
    };
  });
  if (requestBatch.length) await supabase.from("work_requests").insert(requestBatch);
  console.log(`  Work requests: ${requestBatch.length}`);

  // 14) Purchase orders (expected_delivery_date, total_cost; lines with product_id, quantity, unit_price, line_total)
  const poVendorIds = vendorIds.slice(0, 5);
  const poStatuses = ["draft", "ordered", "received"];
  const productIdsWithConfig = cfg.products
    .filter((p) => productIdBySku.has(p.sku))
    .map((p) => ({ id: productIdBySku.get(p.sku)!, config: p }));
  for (let i = 0; i < 6; i++) {
    const orderDate = backdateMonths(randomInRange(1, 4));
    const expectedDelivery = new Date(orderDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + 7);
    const { data: po } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: companyId,
        vendor_id: poVendorIds[i % poVendorIds.length],
        po_number: `PO-${cfg.slug.slice(0, 4).toUpperCase()}-${2000 + i}`,
        status: poStatuses[i % poStatuses.length],
        order_date: orderDate.toISOString().slice(0, 10),
        expected_delivery_date: expectedDelivery.toISOString().slice(0, 10),
        notes: "Demo PO",
      })
      .select("id")
      .single();
    if (po?.id && productIdsWithConfig.length >= 2) {
      const lineProducts = [
        productIdsWithConfig[(i * 2) % productIdsWithConfig.length],
        productIdsWithConfig[(i * 2 + 1) % productIdsWithConfig.length],
        productIdsWithConfig[(i * 2 + 2) % productIdsWithConfig.length],
      ].filter(Boolean);
      let totalCost = 0;
      const lines = lineProducts.map(({ id, config }, idx) => {
        const qty = 5 + (i + idx) % 10;
        const unitPrice = getDefaultCostForProduct(config);
        const lineTotal = Math.round(qty * unitPrice * 100) / 100;
        totalCost += lineTotal;
        return {
          purchase_order_id: po.id,
          product_id: id,
          description: config.name,
          quantity: qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          sort_order: idx,
        };
      });
      await supabase.from("purchase_order_lines").insert(lines);
      await supabase
        .from("purchase_orders")
        .update({ total_cost: Math.round(totalCost * 100) / 100 })
        .eq("id", po.id);
    }
  }
  console.log("  Purchase orders: 6");

  // 15) Activity logs (work orders: created + completed; assets: updated) — backdated so history feels like months of use
  const { data: recentWos } = await supabase
    .from("work_orders")
    .select("id, company_id")
    .eq("tenant_id", tenantId)
    .limit(25);
  for (const wo of recentWos ?? []) {
    const performedAt = backdateMonths(randomInRange(0, 5));
    await supabase.from("activity_logs").insert({
      tenant_id: tenantId,
      company_id: wo.company_id,
      entity_type: "work_order",
      entity_id: wo.id,
      action_type: "work_order_created",
      performed_at: performedAt.toISOString(),
      metadata: {},
    });
  }
  const { data: completedWosForLogs } = await supabase
    .from("work_orders")
    .select("id, company_id, completed_at")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .limit(30);
  for (const wo of (completedWosForLogs ?? []) as { id: string; company_id: string; completed_at: string }[]) {
    await supabase.from("activity_logs").insert({
      tenant_id: tenantId,
      company_id: wo.company_id,
      entity_type: "work_order",
      entity_id: wo.id,
      action_type: "work_order_completed",
      performed_at: wo.completed_at,
      metadata: {},
    });
  }
  for (let i = 0; i < Math.min(20, allAssetIds.length); i++) {
    await supabase.from("activity_logs").insert({
      tenant_id: tenantId,
      company_id: companyId,
      entity_type: "asset",
      entity_id: allAssetIds[i],
      action_type: "asset_updated",
      performed_at: backdateMonths(randomInRange(0, 8)).toISOString(),
      metadata: {},
    });
  }
  console.log("  Activity logs: added");
  // Ensure the guided demo scenario anchors exist even when this is a fresh tenant seed.
  await ensureScenarioDataForTenant(supabase, tenantId, companyId);
}
