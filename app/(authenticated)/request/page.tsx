import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { RequestSubmissionForm } from "./components/request-submission-form";

export const metadata = {
  title: "Submit Work Request | Cornerstone Tech",
  description: "Submit a maintenance issue for review and dispatch",
};

type AssetOption = {
  id: string;
  name: string;
  company_id: string | null;
};

export default async function RequestSubmissionPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Submit work request</h1>
        <p className="text-sm text-[var(--muted)]">
          Create a company first to start submitting maintenance requests.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await scope.supabase.auth.getUser();

  const { data: assetsRaw } = await scope.supabase
    .from("assets")
    .select("id, asset_name, name, company_id")
    .in("company_id", scope.companyIds)
    .order("asset_name")
    .order("name");

  const assets = (assetsRaw ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: record.id as string,
      company_id: (record.company_id as string | null) ?? null,
      name:
        (record.asset_name as string | null) ??
        (record.name as string | null) ??
        "Asset",
    } as AssetOption;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Submit work request
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Report a maintenance issue for approval and conversion into a work order.
        </p>
      </div>
      <RequestSubmissionForm
        companies={scope.companies}
        assets={assets}
        defaultRequesterName={(user?.user_metadata?.full_name as string | undefined) ?? ""}
        defaultRequesterEmail={user?.email ?? ""}
      />
    </div>
  );
}
