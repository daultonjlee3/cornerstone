import { ClipboardList } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { JobsList } from "./components/jobs-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";

export const metadata = {
  title: "Fleet Jobs | Cornerstone Tech",
  description: "Manage fleet jobs and dispatch",
};

export default async function JobsPage({
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

  const [{ data: jobs, error, count }, { data: branches }, { data: sites }, { data: trucks }] =
    await Promise.all([
      supabase
        .from("fleet_jobs")
        .select(
          "id, branch_id, customer_site_id, title, description, status, priority, scheduled_start, scheduled_end, revenue_estimate, required_truck_type, assigned_truck_id, external_source_id, branches(name), customer_sites(name)",
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("scheduled_start", { ascending: false, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1),
      supabase.from("branches").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("customer_sites").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("trucks").select("id, unit_number").eq("tenant_id", tenantId).order("unit_number"),
    ]);

  const jobRows = (jobs ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const branchesRaw = record.branches;
    const sitesRaw = record.customer_sites;
    const branchRecord = Array.isArray(branchesRaw)
      ? (branchesRaw[0] as { name?: string } | undefined)
      : (branchesRaw as { name?: string } | null);
    const siteRecord = Array.isArray(sitesRaw)
      ? (sitesRaw[0] as { name?: string } | undefined)
      : (sitesRaw as { name?: string } | null);
    return {
      id: String(record.id),
      branch_id: String(record.branch_id),
      customer_site_id: String(record.customer_site_id),
      title: String(record.title),
      description: record.description == null ? null : String(record.description),
      status: String(record.status ?? "unassigned"),
      priority: String(record.priority ?? "medium"),
      scheduled_start: record.scheduled_start == null ? null : String(record.scheduled_start),
      scheduled_end: record.scheduled_end == null ? null : String(record.scheduled_end),
      revenue_estimate: Number(record.revenue_estimate ?? 0),
      required_truck_type: String(record.required_truck_type),
      assigned_truck_id:
        record.assigned_truck_id == null ? null : String(record.assigned_truck_id),
      external_source_id:
        record.external_source_id == null ? null : String(record.external_source_id),
      job_source: record.external_source_id ? "Webhook" : "Manual",
      branch_name: branchRecord?.name ?? null,
      site_name: siteRecord?.name ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ClipboardList className="size-5" />}
        title="Fleet Jobs"
        subtitle="Manage dispatch jobs, revenue estimates, and truck assignments."
        variant="surface"
      />
      <JobsList
        jobs={jobRows}
        branches={(branches ?? []) as { id: string; name: string }[]}
        sites={(sites ?? []) as { id: string; name: string }[]}
        trucks={(trucks ?? []) as { id: string; unit_number: string }[]}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
