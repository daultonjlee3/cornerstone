import Link from "next/link";
import { Cpu } from "lucide-react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { getAssetIntelligenceDashboard } from "@/src/lib/assets/assetIntelligenceService";
import { AssetIntelligenceDashboardView } from "../components/asset-intelligence-dashboard-view";
import { PageHeader } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { AssetOptimizationCopilot } from "@/src/components/operation-optimization/AssetOptimizationCopilot";

export const metadata = {
  title: "Asset Intelligence | Cornerstone Tech",
  description: "Portfolio-level asset intelligence dashboard",
};


function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

export default async function AssetIntelligencePage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const params = await resolveSearchParams(searchParams);
  const selectedCompanyId = firstParam(params.company_id);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const dashboardData = await getAssetIntelligenceDashboard({
    companyId: selectedCompanyId,
    supabase: supabase as unknown as SupabaseClient,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        variant="surface"
        icon={<Cpu className="size-5" />}
        title="Asset Intelligence Dashboard"
        subtitle="Portfolio health, failure risk, recurring issue patterns, and replacement pressure."
        actions={
          <Link href="/assets">
            <Button variant="secondary">Back to Assets</Button>
          </Link>
        }
        meta={
          <form className="flex flex-wrap gap-2">
          <select
            name="company_id"
            defaultValue={selectedCompanyId ?? ""}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <option value="">All companies</option>
            {(companies ?? []).map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Apply
          </button>
          <Link
            href="/assets/intelligence"
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]/80"
          >
            Reset
          </Link>
        </form>
        }
      />

      <AssetOptimizationCopilot />

      <AssetIntelligenceDashboardView
        data={dashboardData}
        selectedCompanyId={selectedCompanyId}
      />
    </div>
  );
}
