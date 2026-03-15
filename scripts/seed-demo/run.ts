/**
 * Multi-tenant demo seed runner.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Optional: PEXELS_API_KEY for asset category images
 *
 * Run from project root: npx tsx scripts/seed-demo/run.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from project root (parent of scripts/)
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../../src/lib/supabase/admin";
import { DEMO_TENANTS } from "./config";
import { seedTenant } from "./steps";
import { validateDemoSeed, printDemoOperationalSummary } from "./validation";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local.");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log("Starting multi-tenant demo seed...\n");

  for (let i = 0; i < DEMO_TENANTS.length; i++) {
    const cfg = DEMO_TENANTS[i];
    console.log(`[${i + 1}/${DEMO_TENANTS.length}] Seeding: ${cfg.tenantName}`);
    try {
      await seedTenant(supabase, cfg);
      console.log(`  Done: ${cfg.tenantName}\n`);
    } catch (err) {
      console.error(`  Failed: ${cfg.tenantName}`, err);
      // Continue with next tenant
    }
  }

  await validateDemoSeed(supabase, DEMO_TENANTS.map((c) => c.slug));
  await printDemoOperationalSummary(supabase, DEMO_TENANTS.map((c) => c.slug));
  console.log("Demo seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
