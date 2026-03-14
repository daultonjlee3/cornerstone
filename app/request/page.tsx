import { createClient } from "@/src/lib/supabase/server";
import { RequestForm } from "./components/RequestForm";

export const metadata = {
  title: "Maintenance Request | Cornerstone OS",
  description: "Submit a maintenance request",
};

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

async function getPortalProperties(companyId: string | undefined): Promise<PropertyOption[]> {
  if (!companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name")
    .limit(100);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return { id: r.id as string, name: (r.name as string) || "Property" };
  });
}

async function getPortalAssets(companyId: string | undefined): Promise<AssetOption[]> {
  if (!companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("id, asset_name, name")
    .eq("company_id", companyId)
    .order("asset_name")
    .order("name")
    .limit(200);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name:
        (r.asset_name as string | null) ?? (r.name as string | null) ?? "Asset",
    };
  });
}

export default async function RequestPage() {
  const companyId = process.env.PORTAL_COMPANY_ID?.trim();
  const [properties, assets] = await Promise.all([
    getPortalProperties(companyId),
    getPortalAssets(companyId),
  ]);

  return (
    <div className="min-h-screen px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Maintenance Request
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Submit a request and we&apos;ll get back to you.
          </p>
        </header>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-10">
          <RequestForm properties={properties} assets={assets} />
        </div>
        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Cornerstone OS
        </p>
      </div>
    </div>
  );
}
