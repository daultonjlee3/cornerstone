/**
 * Reset demo environments so the next seed creates fresh work orders and optional PM dates.
 * Deletes all work orders for demo tenants (cascade removes related rows).
 * Optionally refreshes preventive_maintenance_plans.next_run_date for a realistic spread.
 *
 * Run from project root: npx tsx scripts/seed-demo/reset.ts
 * Then run: npm run seed:demo
 *
 * Or use: npm run seed:demo:refresh (reset + seed in one go).
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../../src/lib/supabase/admin";
import { DEMO_TENANTS } from "./config";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local.");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const slugs = DEMO_TENANTS.map((c) => c.slug);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("slug", slugs);
  const list = (tenants ?? []) as { id: string; name: string }[];
  if (list.length === 0) {
    console.log("No demo tenants found. Nothing to reset.");
    return;
  }

  const tenantIds = list.map((t) => t.id);
  const { data: companies } = await supabase
    .from("companies")
    .select("id, tenant_id")
    .in("tenant_id", tenantIds);
  const companyList = (companies ?? []) as { id: string; tenant_id: string }[];
  const companyIds = companyList.map((c) => c.id);
  if (companyIds.length === 0) {
    console.log("No demo companies found. Nothing to reset.");
    return;
  }

  // Delete work orders for demo companies (child rows cascade)
  const { count: woCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds);
  const toDelete = woCount ?? 0;
  if (toDelete > 0) {
    const { error: delErr } = await supabase
      .from("work_orders")
      .delete()
      .in("company_id", companyIds);
    if (delErr) {
      console.error("Failed to delete work orders:", delErr.message);
      process.exit(1);
    }
    console.log(`Deleted ${toDelete} work orders for demo tenants.`);
  } else {
    console.log("No demo work orders to delete.");
  }

  // Refresh PM plan next_run_date so overdue / due soon / upcoming lists look active
  const { data: plans } = await supabase
    .from("preventive_maintenance_plans")
    .select("id")
    .in("company_id", companyIds)
    .eq("status", "active");
  const planRows = (plans ?? []) as { id: string }[];
  const todayStr = todayISO();
  let updated = 0;
  for (let i = 0; i < planRows.length; i++) {
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
    const { error } = await supabase
      .from("preventive_maintenance_plans")
      .update({ next_run_date: nextRunDate })
      .eq("id", planRows[i].id);
    if (!error) updated++;
  }
  if (planRows.length > 0) {
    console.log(`Refreshed next_run_date for ${updated} PM plans.`);
  }

  console.log("Demo reset complete. Run npm run seed:demo to repopulate work orders and see the operational mix.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
