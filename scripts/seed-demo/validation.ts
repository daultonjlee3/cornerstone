/**
 * Post-seed validation: report counts of important blank (null/empty) fields by entity
 * so we can quickly see demo quality issues. Run after seeding all demo tenants.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DemoValidationResult = {
  entity: string;
  total: number;
  blankCount: number;
  field: string;
};

/** Run validation for demo tenants (by slug) and log a summary. */
export async function validateDemoSeed(
  supabase: SupabaseClient,
  tenantSlugs: string[]
): Promise<DemoValidationResult[]> {
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id")
    .in("slug", tenantSlugs);
  const tenantIds = ((tenants ?? []) as { id: string }[]).map((r) => r.id);
  if (tenantIds.length === 0) {
    console.log("\nDemo seed validation: no demo tenants found (skip).");
    return [];
  }

  const companyIds = await getCompanyIds(supabase, tenantIds);
  const results: DemoValidationResult[] = [];

  // Companies: legal_name, primary_contact_name
  const { count: companiesTotal } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds);
  const { count: companiesNoLegal } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds)
    .is("legal_name", null);
  const { count: companiesNoContact } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds)
    .is("primary_contact_name", null);
  results.push({
    entity: "companies",
    total: companiesTotal ?? 0,
    blankCount: companiesNoLegal ?? 0,
    field: "legal_name",
  });
  results.push({
    entity: "companies",
    total: companiesTotal ?? 0,
    blankCount: companiesNoContact ?? 0,
    field: "primary_contact_name",
  });

  // Properties: address_line1 or address
  const { data: props } = await supabase
    .from("properties")
    .select("id")
    .in("company_id", companyIds);
  const propIds = ((props ?? []) as { id: string }[]).map((r) => r.id);
  if (propIds.length > 0) {
    const { count: propsNoAddr } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .in("id", propIds)
      .is("address_line1", null);
    results.push({
      entity: "properties",
      total: propIds.length,
      blankCount: propsNoAddr ?? 0,
      field: "address_line1",
    });
  }

  // Buildings: year_built or square_feet
  const { data: blds } = await supabase
    .from("buildings")
    .select("id")
    .in("property_id", propIds.length > 0 ? propIds : []);
  const bldIds = ((blds ?? []) as { id: string }[]).map((r) => r.id);
  if (bldIds.length > 0) {
    const { count: bldNoMeta } = await supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .in("id", bldIds)
      .is("year_built", null)
      .is("square_feet", null);
    results.push({
      entity: "buildings",
      total: bldIds.length,
      blankCount: bldNoMeta ?? 0,
      field: "year_built/square_feet",
    });
  }

  // Assets: condition, criticality (criticality has default; condition often blank)
  const { count: assetsTotal } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds);
  const { count: assetsNoCondition } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds)
    .is("condition", null);
  results.push({
    entity: "assets",
    total: assetsTotal ?? 0,
    blankCount: assetsNoCondition ?? 0,
    field: "condition",
  });

  // Work orders: completion_notes for completed
  const { count: woTotal } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds);
  const { count: woCompleted } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds)
    .eq("status", "completed");
  const { count: woCompletedNoNotes } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("tenant_id", tenantIds)
    .eq("status", "completed")
    .is("completion_notes", null);
  results.push({
    entity: "work_orders",
    total: woCompleted ?? 0,
    blankCount: woCompletedNoNotes ?? 0,
    field: "completion_notes (completed only)",
  });

  // Products: default_cost
  const { count: productsTotal } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds);
  const { count: productsNoCost } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds)
    .is("default_cost", null);
  results.push({
    entity: "products",
    total: productsTotal ?? 0,
    blankCount: productsNoCost ?? 0,
    field: "default_cost",
  });

  // Purchase orders: total_cost or expected_delivery_date
  const { count: poTotal } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds);
  const { count: poNoExpected } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds)
    .is("expected_delivery_date", null);
  results.push({
    entity: "purchase_orders",
    total: poTotal ?? 0,
    blankCount: poNoExpected ?? 0,
    field: "expected_delivery_date",
  });

  logValidationSummary(results);
  return results;
}

async function getCompanyIds(supabase: SupabaseClient, tenantIds: string[]): Promise<string[]> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .in("tenant_id", tenantIds);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

/** Per-tenant operational mix summary (work orders by status, PM by overdue/upcoming). */
export async function printDemoOperationalSummary(
  supabase: SupabaseClient,
  tenantSlugs: string[]
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const today7 = in7.toISOString().slice(0, 10);
  const today30 = in30.toISOString().slice(0, 10);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .in("slug", tenantSlugs);
  const list = (tenants ?? []) as { id: string; name: string; slug: string }[];
  if (list.length === 0) return;

  let totalCompleted = 0;
  let totalInProgress = 0;
  let totalScheduled = 0;
  let totalOverdue = 0;
  let totalPmOverdue = 0;
  let totalPmUpcoming = 0;
  let totalTechnicians = 0;
  let totalWorkOrders = 0;

  console.log("\n--- Demo operational mix (per tenant) ---");
  for (const tenant of list) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("tenant_id", tenant.id);
    const companyIds = ((companies ?? []) as { id: string }[]).map((r) => r.id);
    if (companyIds.length === 0) continue;

    const [
      { count: completed },
      { count: inProgress },
      { count: scheduled },
      { count: ready },
      { count: newCount },
      { count: overdue },
      { count: onHold },
      { count: pmOverdue },
      { count: pmDueSoon },
      { count: pmUpcoming },
      { count: techCount },
      { count: woCount },
    ] = await Promise.all([
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "completed"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "in_progress"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "scheduled"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "ready_to_schedule"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "new"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).lt("due_date", today).not("status", "in", "(completed,cancelled)"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "on_hold"),
      supabase.from("preventive_maintenance_plans").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "active").lt("next_run_date", today),
      supabase.from("preventive_maintenance_plans").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "active").gte("next_run_date", today).lte("next_run_date", today7),
      supabase.from("preventive_maintenance_plans").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "active").gt("next_run_date", today7).lte("next_run_date", today30),
      supabase.from("technicians").select("id", { count: "exact", head: true }).in("company_id", companyIds).eq("status", "active"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("company_id", companyIds),
    ]);

    totalCompleted += completed ?? 0;
    totalInProgress += inProgress ?? 0;
    totalScheduled += scheduled ?? 0;
    totalOverdue += overdue ?? 0;
    totalPmOverdue += pmOverdue ?? 0;
    totalPmUpcoming += pmUpcoming ?? 0;
    totalTechnicians += techCount ?? 0;
    totalWorkOrders += woCount ?? 0;

    console.log(`  ${tenant.name} (${tenant.slug}):`);
    console.log(`    Work orders: completed ${completed ?? 0}, in progress ${inProgress ?? 0}, scheduled ${scheduled ?? 0}, ready/unassigned ${(ready ?? 0) + (newCount ?? 0)}, overdue ${overdue ?? 0}, on hold ${onHold ?? 0}`);
    console.log(`    PM: overdue/missed ${pmOverdue ?? 0}, due soon (7d) ${pmDueSoon ?? 0}, upcoming (30d) ${pmUpcoming ?? 0}`);
  }
  console.log("----------------------------------------\n");

  console.log("Demo environment created\n");
  console.log(`  Technicians scheduled: ${totalTechnicians}`);
  console.log(`  Work orders created: ${totalWorkOrders}`);
  console.log(`  Completed work orders: ${totalCompleted}`);
  console.log(`  In progress: ${totalInProgress}`);
  console.log(`  Scheduled: ${totalScheduled}`);
  console.log(`  Overdue: ${totalOverdue}`);
  console.log(`  PM tasks upcoming: ${totalPmUpcoming}`);
  console.log(`  PM tasks overdue: ${totalPmOverdue}\n`);
}

function logValidationSummary(results: DemoValidationResult[]): void {
  console.log("\n--- Demo seed validation ---");
  if (results.length === 0) {
    console.log("No entities to validate.");
    return;
  }
  let hasBlanks = false;
  for (const r of results) {
    const pct = r.total > 0 ? Math.round((r.blankCount / r.total) * 100) : 0;
    const badge = r.blankCount > 0 ? (pct > 50 ? "⚠️" : "▸") : "✓";
    if (r.blankCount > 0) hasBlanks = true;
    console.log(
      `  ${badge} ${r.entity}.${r.field}: ${r.blankCount}/${r.total} blank${pct > 0 ? ` (${pct}%)` : ""}`
    );
  }
  if (hasBlanks) {
    console.log("  → Fix blank fields in scripts/seed-demo/steps.ts or config to improve demo quality.");
  } else {
    console.log("  → All checked fields have values.");
  }
  console.log("--------------------------------\n");
}
