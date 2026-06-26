/**
 * Peachtree Industrial Services — golden demo seed
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_SEED_ENABLED=true
 *
 * Commands (from project root):
 *   npm run seed:peachtree-demo           — reset + seed + validate (golden demo)
 *   npm run seed:fleet-demo               — seed only (no reset)
 *   npm run seed:fleet-demo:reset         — clear fleet data for Peachtree tenant
 *   npm run seed:fleet-demo:refresh       — reset + seed (alias)
 *   npm run seed:fleet-demo:validate      — validation checklist only
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../../src/lib/supabase/admin";
import { refreshUtilizationDailyForTenant } from "../../src/lib/fleet/marts/refresh-utilization-daily";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import { MART_HISTORY_DAYS, PEACHTREE_TENANT } from "./constants";
import { assertDemoSeedAllowed, assertTenantSlugAllowed } from "./guards";
import { resetPeachtreeFleetDemo } from "./reset";
import { seedPeachtreeFleetDemo } from "./seed";
import { addDays, demoBoardDate, todayDateOnly } from "./utils";
import { printValidationReport, validatePeachtreeFleetDemo } from "./validate";

async function resolveTenantId(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", PEACHTREE_TENANT.slug)
    .maybeSingle();
  if (!tenant?.id) {
    throw new Error(`Tenant "${PEACHTREE_TENANT.slug}" not found. Run seed first.`);
  }
  return tenant.id as string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local.");
    process.exit(1);
  }

  const mode = process.argv[2] ?? "seed";
  const supabase = createAdminClient();

  const needsGuard = ["seed", "reset", "refresh"].includes(mode);
  if (needsGuard) {
    assertDemoSeedAllowed();
    assertTenantSlugAllowed(PEACHTREE_TENANT.slug);
  }

  switch (mode) {
    case "reset": {
      await resetPeachtreeFleetDemo(supabase);
      break;
    }
    case "refresh": {
      console.log(`\n=== Peachtree Industrial Golden Demo (reset + seed) ===\n`);
      await resetPeachtreeFleetDemo(supabase);
      const result = await seedPeachtreeFleetDemo(supabase);
      printSeedSummary(result);
      const { checks, allPass } = await validatePeachtreeFleetDemo(supabase, result.tenantId);
      printValidationReport(checks, allPass);
      if (!allPass) process.exit(1);
      break;
    }
    case "marts": {
      const tenantId = await resolveTenantId(supabase);
      const from = addDays(todayDateOnly(), -MART_HISTORY_DAYS);
      const to = demoBoardDate();
      console.log(`Refreshing marts for ${PEACHTREE_TENANT.slug} (${from} → ${to})…`);
      const result = await refreshUtilizationDailyForTenant(supabase, tenantId, from, to);
      console.log(result);
      break;
    }
    case "recommend": {
      const tenantId = await resolveTenantId(supabase);
      const boardDate = demoBoardDate();
      console.log(`Regenerating recommendations for ${boardDate}…`);
      const recs = await getFleetRecommendations(supabase, tenantId, {
        date: boardDate,
        forceRefresh: true,
      });
      console.log(`${recs.pending.length} recommendations`);
      break;
    }
    case "validate": {
      const { checks, allPass } = await validatePeachtreeFleetDemo(supabase);
      printValidationReport(checks, allPass);
      if (!allPass) process.exit(1);
      break;
    }
    case "seed":
    default: {
      console.log(`\n=== Peachtree Industrial Golden Demo Seed ===\n`);
      const result = await seedPeachtreeFleetDemo(supabase);
      printSeedSummary(result);
      const { checks, allPass } = await validatePeachtreeFleetDemo(supabase, result.tenantId);
      printValidationReport(checks, allPass);
      if (!allPass) process.exit(1);
      break;
    }
  }
}

function printSeedSummary(result: Awaited<ReturnType<typeof seedPeachtreeFleetDemo>>): void {
  console.log("\nSeed summary:");
  console.log(`  Tenant:           ${PEACHTREE_TENANT.slug} (${result.tenantId})`);
  console.log(`  Demo board date:  ${result.demoBoardDate}`);
  console.log(`  Trucks:           ${result.truckCount}`);
  console.log(`  Operators:        ${result.operatorCount}`);
  console.log(`  Jobs:             ${result.jobCount}`);
  console.log(`  Telematics:       ${result.telematicsCount} events`);
  console.log(`  Recommendations:  ${result.recommendationCount}`);
  console.log(`\nDemo login: assign a user to tenant slug "${PEACHTREE_TENANT.slug}"`);
  console.log(`Dispatch URL: /dispatch?date=${result.demoBoardDate}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
