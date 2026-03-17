import { ShoppingCart } from "lucide-react";
import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { PurchaseOrdersList } from "./components/purchase-orders-list";
import type { PurchaseOrderRecord } from "./components/purchase-order-form-modal";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Purchase Orders | Cornerstone Tech",
  description: "Procurement & receiving",
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ useTemplate?: string }>;
}) {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");
  const resolved = await searchParams;
  const useTemplateId = typeof resolved.useTemplate === "string" ? resolved.useTemplate.trim() || undefined : undefined;

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <PageHeader
          icon={<ShoppingCart className="size-5" />}
          title="Purchase Orders"
          subtitle="Create a company first to manage procurement workflows."
        />
      </div>
    );
  }

  const [purchaseOrdersResult, vendorsResult, productsResult] = await Promise.all([
    scope.supabase
      .from("purchase_orders")
      .select(
        "id, company_id, vendor_id, po_number, status, order_date, expected_delivery_date, notes, total_cost, created_at, updated_at, companies(name), vendors(name), purchase_order_lines(count)"
      )
      .in("company_id", scope.companyIds)
      .order("created_at", { ascending: false }),
    scope.supabase
      .from("vendors")
      .select("id, name, company_id")
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
    scope.supabase
      .from("products")
      .select("id, name, sku, default_cost, company_id, default_vendor_id, taxable_default")
      .in("company_id", scope.companyIds)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const vendorIds = (vendorsResult.data ?? []).map((r) => (r as { id: string }).id);
  const { data: vendorPricingData } =
    vendorIds.length > 0
      ? await scope.supabase
          .from("vendor_pricing")
          .select("vendor_id, product_id, unit_cost, taxable_override")
          .in("vendor_id", vendorIds)
      : { data: [] as { vendor_id: string; product_id: string; unit_cost: number; taxable_override: boolean | null }[] };

  const rows = (purchaseOrdersResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    const vendor = Array.isArray(record.vendors) ? record.vendors[0] : record.vendors;
    const lines = record.purchase_order_lines as unknown;
    let lineCount = 0;
    if (typeof lines === "number" && Number.isFinite(lines)) lineCount = lines;
    else if (Array.isArray(lines) && lines[0] && typeof (lines[0] as { count?: number }).count === "number")
      lineCount = (lines[0] as { count: number }).count;
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
      line_count: lineCount,
    } as PurchaseOrderRecord;
  });

  const vendors = (vendorsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    company_id: (row as { company_id: string }).company_id,
  }));

  const products = (productsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    sku: (row as { sku?: string | null }).sku ?? null,
    default_cost: (row as { default_cost?: number | null }).default_cost ?? null,
    company_id: (row as { company_id?: string }).company_id ?? undefined,
    default_vendor_id: (row as { default_vendor_id?: string | null }).default_vendor_id ?? null,
    taxable_default: (row as { taxable_default?: boolean }).taxable_default !== false,
  }));

  const vendorPricing = (vendorPricingData ?? []).map((row) => ({
    vendor_id: (row as { vendor_id: string }).vendor_id,
    product_id: (row as { product_id: string }).product_id,
    unit_cost: Number((row as { unit_cost?: number }).unit_cost ?? 0),
    taxable_override: (row as { taxable_override?: boolean | null }).taxable_override ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShoppingCart className="size-5" />}
        title="Purchase Orders"
        subtitle="Draft, order, receive, and reconcile procurement against location-level inventory."
      />
      <PurchaseOrdersList
        rows={rows}
        companies={scope.companies}
        vendors={vendors}
        products={products}
        vendorPricing={vendorPricing}
        useTemplateId={useTemplateId}
      />
    </div>
  );
}
