import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { RequestsList, type WorkRequestListItem } from "./components/requests-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { TakeTourButton } from "@/src/components/guidance/TakeTourButton";

export const metadata = {
  title: "Work Requests | Cornerstone Tech",
  description: "Approve, reject, and convert incoming maintenance requests",
};

export default async function RequestsPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  const { data: requestsRaw } = await scope.supabase
    .from("work_requests")
    .select(
      "id, tenant_id, company_id, requester_name, requester_email, location, asset_id, description, priority, photo_url, status, created_at, assets(asset_name, name), companies(name)"
    )
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false });

  const requestIds = (requestsRaw ?? []).map((row) => (row as { id: string }).id);
  const { data: linkedWorkOrdersRaw } = requestIds.length
    ? await scope.supabase
        .from("work_orders")
        .select("id, request_id, work_order_number, status, scheduled_date, completed_at, created_at")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false })
    : { data: [] as unknown[] };

  const latestWorkOrderByRequestId = new Map<string, Record<string, unknown>>();
  (linkedWorkOrdersRaw ?? []).forEach((row) => {
    const record = row as Record<string, unknown>;
    const requestId = (record.request_id as string | null) ?? null;
    if (!requestId) return;
    if (!latestWorkOrderByRequestId.has(requestId)) {
      latestWorkOrderByRequestId.set(requestId, record);
    }
  });

  const requests = (requestsRaw ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const assetRel = Array.isArray(record.assets) ? record.assets[0] : record.assets;
    const companyRel = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    const linkedWorkOrder = latestWorkOrderByRequestId.get(record.id as string) ?? null;

    return {
      id: record.id as string,
      tenant_id: record.tenant_id as string,
      company_id: (record.company_id as string | null) ?? null,
      requester_name: (record.requester_name as string) ?? "Requester",
      requester_email: (record.requester_email as string) ?? "",
      location: (record.location as string) ?? "",
      asset_id: (record.asset_id as string | null) ?? null,
      asset_name:
        assetRel && typeof assetRel === "object"
          ? ((assetRel as { asset_name?: string | null }).asset_name ??
            (assetRel as { name?: string | null }).name ??
            null)
          : null,
      description: (record.description as string) ?? "",
      priority: (record.priority as string) ?? "medium",
      photo_url: (record.photo_url as string | null) ?? null,
      status: (record.status as string) ?? "submitted",
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      company_name:
        companyRel && typeof companyRel === "object"
          ? ((companyRel as { name?: string | null }).name ?? null)
          : null,
      linked_work_order_id: (linkedWorkOrder?.id as string | undefined) ?? null,
      linked_work_order_number:
        (linkedWorkOrder?.work_order_number as string | undefined) ?? null,
      linked_work_order_status: (linkedWorkOrder?.status as string | undefined) ?? null,
      linked_work_order_scheduled_date:
        (linkedWorkOrder?.scheduled_date as string | undefined) ?? null,
      linked_work_order_completed_at:
        (linkedWorkOrder?.completed_at as string | undefined) ?? null,
    } satisfies WorkRequestListItem;
  });

  return (
    <div className="space-y-6" data-tour="requests:header">
      <PageHeader
        icon={<Inbox className="size-5" />}
        title="Work requests"
        subtitle="Review incoming requests, approve or reject them, and convert approved requests into work orders."
        actions={<TakeTourButton />}
      />
      <RequestsList requests={requests} />
    </div>
  );
}
