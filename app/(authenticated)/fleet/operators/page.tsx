import { Users } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { OperatorsList } from "./components/operators-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";

export const metadata = {
  title: "Operators | Cornerstone Tech",
  description: "Manage fleet operators and drivers",
};

export default async function OperatorsPage({
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
  const page = Math.max(1, parseInt(typeof params?.page === "string" ? params.page : "", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(typeof params?.page_size === "string" ? params.page_size : "", 10) || 25)
  );

  const [{ data: operators, error, count }, { data: branches }] = await Promise.all([
    supabase
      .from("fleet_operators")
      .select("id, branch_id, name, operator_role, is_active, branches(name)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("name")
      .range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).order("name"),
  ]);

  const operatorRows = (operators ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const branchesRaw = record.branches;
    const branchRecord = Array.isArray(branchesRaw)
      ? (branchesRaw[0] as { name?: string } | undefined)
      : (branchesRaw as { name?: string } | null);
    return {
      id: String(record.id),
      branch_id: String(record.branch_id),
      name: String(record.name),
      operator_role: String(record.operator_role),
      is_active: Boolean(record.is_active),
      branch_name: branchRecord?.name ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Users className="size-5" />}
        title="Operators"
        subtitle="Manage drivers, operators, and crew leads."
      />
      <OperatorsList
        operators={operatorRows}
        branches={(branches ?? []) as { id: string; name: string }[]}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
