import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetIntelligenceDashboard } from "@/src/lib/assets/assetIntelligenceService";
import { AssetIntelligenceDashboardView } from "../components/asset-intelligence-dashboard-view";

export const metadata = {
  title: "Asset Intelligence | Cornerstone Tech",
  description: "Portfolio-level asset intelligence dashboard",
};

type SearchParams = { [key: string]: string | string[] | undefined };

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

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const params =
    typeof (searchParams as Promise<SearchParams>)?.then === "function"
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams as SearchParams);
  const selectedCompanyId = firstParam(params.company_id);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const dashboardData = await getAssetIntelligenceDashboard({
    companyId: selectedCompanyId,
    supabase: supabase as unknown as SupabaseClient,
  });

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Asset Intelligence Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Portfolio health, failure risk, recurring issue patterns, and replacement pressure.
            </p>
          </div>
          <Link
            href="/assets"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
          >
            Back to Assets
          </Link>
        </div>
        <form className="mt-4 flex flex-wrap gap-2">
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
      </header>

      <AssetIntelligenceDashboardView data={dashboardData} />
    </div>
  );
}
