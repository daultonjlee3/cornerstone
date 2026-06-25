/**
 * Peachtree Industrial Services — Fleet Intelligence demo seed
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Commands (from project root):
 *   npm run seed:fleet-demo              — full seed + marts + recommendations + validate
 *   npm run seed:fleet-demo:reset        — clear fleet data for Peachtree tenant
 *   npm run seed:fleet-demo:refresh      — reset + seed
 *   npm run seed:fleet-demo:marts        — refresh utilization marts only
 *   npm run seed:fleet-demo:recommend    — regenerate recommendations only
 *   npm run seed:fleet-demo:validate     — validation checklist only
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../../src/lib/supabase/admin";
import { refreshUtilizationDailyForTenant } from "../../src/lib/fleet/marts/refresh-utilization-daily";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import { PEACHTREE_TENANT } from "./constants";
import { resetPeachtreeFleetDemo } from "./reset";
import { seedPeachtreeFleetDemo } from "./seed";
import { addDays, todayDateOnly } from "./utils";
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

  switch (mode) {
    case "reset": {
      await resetPeachtreeFleetDemo(supabase);
      break;
    }
    case "marts": {
      const tenantId = await resolveTenantId(supabase);
      const from = addDays(todayDateOnly(), -45);
      const to = todayDateOnly();
      console.log(`Refreshing marts for ${PEACHTREE_TENANT.slug} (${from} → ${to})…`);
      const result = await refreshUtilizationDailyForTenant(supabase, tenantId, from, to);
      console.log(result);
      break;
    }
    case "recommend": {
      const tenantId = await resolveTenantId(supabase);
      console.log("Regenerating recommendations…");
      const recs = await getFleetRecommendations(supabase, tenantId, { forceRefresh: true });
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
      console.log(`\n=== Peachtree Fleet Intelligence Demo Seed ===\n`);
      const result = await seedPeachtreeFleetDemo(supabase);
      console.log("\nSeed summary:");
      console.log(`  Tenant:  ${PEACHTREE_TENANT.slug} (${result.tenantId})`);
      console.log(`  Trucks:  ${result.truckCount}`);
      console.log(`  Jobs:    ${result.jobCount}`);
      console.log(`  Telematics events: ${result.telematicsCount}`);
      const { checks, allPass } = await validatePeachtreeFleetDemo(supabase, result.tenantId);
      printValidationReport(checks, allPass);
      if (!allPass) process.exit(1);
      console.log("Demo login: assign a user to tenant slug peachtree-industrial");
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
