import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { PurchaseOrdersList } from "./components/purchase-orders-list";
import type { PurchaseOrderRecord } from "./components/purchase-order-form-modal";

export const metadata = {
  title: "Purchase Orders | Cornerstone Tech",
  description: "Procurement & receiving",
};

export default async function PurchaseOrdersPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Purchase Orders</h1>
        <p className="text-sm text-[var(--muted)]">Create a company first to manage procurement workflows.</p>
      </div>
    );
  }

  const [purchaseOrdersResult, vendorsResult] = await Promise.all([
    scope.supabase
      .from("purchase_orders")
      .select(
        "id, company_id, vendor_id, po_number, status, order_date, expected_delivery_date, notes, total_cost, created_at, updated_at, companies(name), vendors(name)"
      )
      .in("company_id", scope.companyIds)
      .order("created_at", { ascending: false }),
    scope.supabase
      .from("vendors")
      .select("id, name, company_id")
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
  ]);

  const rows = (purchaseOrdersResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    const vendor = Array.isArray(record.vendors) ? record.vendors[0] : record.vendors;
    return {
      id: record.id as string,
      company_id: record.company_id as string,
      vendor_id: record.vendor_id as string,
      po_number: (record.po_number as string | null) ?? null,
      status: (record.status as string) ?? "draft",
      order_date: (record.order_date as string | null) ?? null,
      expected_delivery_date: (record.expected_delivery_date as string | null) ?? null,
      notes: (record.notes as string | null) ?? null,
      total_cost: (record.total_cost as number | null) ?? 0,
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      updated_at: (record.updated_at as string) ?? new Date().toISOString(),
      company_name:
        company && typeof company === "object" && "name" in (company as Record<string, unknown>)
          ? ((company as { name?: string }).name ?? undefined)
          : undefined,
      vendor_name:
        vendor && typeof vendor === "object" && "name" in (vendor as Record<string, unknown>)
          ? ((vendor as { name?: string }).name ?? undefined)
          : undefined,
    } as PurchaseOrderRecord;
  });

  const vendors = (vendorsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    company_id: (row as { company_id: string }).company_id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Purchase Orders</h1>
        <p className="mt-1 text-[var(--muted)]">
          Draft, order, receive, and reconcile procurement against location-level inventory.
        </p>
      </div>
      <PurchaseOrdersList rows={rows} companies={scope.companies} vendors={vendors} />
    </div>
  );
}
