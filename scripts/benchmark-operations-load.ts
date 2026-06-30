/**
 * Benchmark operations data loaders (server-side).
 * Run: npx tsx scripts/benchmark-operations-load.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or local .env with tenant id.
 */
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { loadFleetOperationsSummary } from "../src/lib/fleet/operations/load-summary";
import { loadFleetOperationsBriefing } from "../src/lib/fleet/operations/load-briefing";
import { loadFleetOperationsEnrichment } from "../src/lib/fleet/operations/load-enrichment";
import { invalidateOperationsSummaryCache } from "../src/lib/fleet/operations/summary-cache";

async function time<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; ms: number }> {
  const start = performance.now();
  await fn();
  return { label, ms: Math.round(performance.now() - start) };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tenantId = process.env.BENCHMARK_TENANT_ID;

  if (!url || !key || !tenantId) {
    console.log("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BENCHMARK_TENANT_ID");
    process.exit(0);
  }

  const supabase = createClient(url, key);

  console.log("Operations loader benchmark (cold cache)\n");
  invalidateOperationsSummaryCache(tenantId);

  const cold = await Promise.all([
    time("summary (cold)", () => loadFleetOperationsSummary(supabase, tenantId, { skipCache: true })),
    time("briefing (cold)", () => loadFleetOperationsBriefing(supabase, tenantId)),
    time("enrichment (cold)", () => loadFleetOperationsEnrichment(supabase, tenantId)),
  ]);

  for (const row of cold) {
    console.log(`  ${row.label}: ${row.ms}ms`);
  }

  console.log("\nOperations loader benchmark (warm summary cache)\n");

  const warm = await Promise.all([
    time("summary (warm)", () => loadFleetOperationsSummary(supabase, tenantId)),
    time("briefing (cached CC)", () => loadFleetOperationsBriefing(supabase, tenantId)),
    time("enrichment (cached CC)", () => loadFleetOperationsEnrichment(supabase, tenantId)),
  ]);

  for (const row of warm) {
    console.log(`  ${row.label}: ${row.ms}ms`);
  }

  const summaryMs = warm.find((r) => r.label.startsWith("summary"))?.ms ?? 9999;
  console.log(`\nTarget: summary warm < 2000ms → ${summaryMs < 2000 ? "PASS" : "FAIL"} (${summaryMs}ms)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
