import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { PurchaseOrderDetailView } from "../components/purchase-order-detail-view";
import type { PurchaseOrderRecord } from "../components/purchase-order-form-modal";

export const metadata = {
  title: "Purchase Order Detail | Cornerstone Tech",
  description: "Purchase order line items and receiving",
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  const { data: poRow } = await scope.supabase
    .from("purchase_orders")
    .select(
      "id, company_id, vendor_id, po_number, status, order_date, expected_delivery_date, notes, total_cost, created_at, updated_at, companies(name), vendors(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!poRow) notFound();

  const companyId = (poRow as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !scope.companyIds.includes(companyId)) notFound();

  const [linesResult, productsResult, locationsResult] = await Promise.all([
    scope.supabase
      .from("purchase_order_lines")
      .select(
        "id, purchase_order_id, product_id, description, quantity, unit_price, unit_cost_snapshot, line_total, received_quantity"
      )
      .eq("purchase_order_id", id)
      .order("created_at", { ascending: true }),
    scope.supabase
      .from("products")
      .select("id, name, sku")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name", { ascending: true }),
    scope.supabase
      .from("stock_locations")
      .select("id, name, location_type")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const companyObj = Array.isArray((poRow as Record<string, unknown>).companies)
    ? ((poRow as Record<string, unknown>).companies as unknown[])[0]
    : (poRow as Record<string, unknown>).companies;
  const vendorObj = Array.isArray((poRow as Record<string, unknown>).vendors)
    ? ((poRow as Record<string, unknown>).vendors as unknown[])[0]
    : (poRow as Record<string, unknown>).vendors;

  const purchaseOrder = {
    id: (poRow as { id: string }).id,
    company_id: companyId,
    vendor_id: (poRow as { vendor_id: string }).vendor_id,
    po_number: (poRow as { po_number?: string | null }).po_number ?? null,
    status: (poRow as { status?: string }).status ?? "draft",
    order_date: (poRow as { order_date?: string | null }).order_date ?? null,
    expected_delivery_date:
      (poRow as { expected_delivery_date?: string | null }).expected_delivery_date ?? null,
    notes: (poRow as { notes?: string | null }).notes ?? null,
    total_cost: (poRow as { total_cost?: number | null }).total_cost ?? 0,
    created_at: (poRow as { created_at?: string }).created_at ?? new Date().toISOString(),
    updated_at: (poRow as { updated_at?: string }).updated_at ?? new Date().toISOString(),
    company_name:
      companyObj && typeof companyObj === "object" && "name" in (companyObj as Record<string, unknown>)
        ? ((companyObj as { name?: string }).name ?? undefined)
        : undefined,
    vendor_name:
      vendorObj && typeof vendorObj === "object" && "name" in (vendorObj as Record<string, unknown>)
        ? ((vendorObj as { name?: string }).name ?? undefined)
        : undefined,
  } as PurchaseOrderRecord;

  const lines = (linesResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    purchase_order_id: (row as { purchase_order_id: string }).purchase_order_id,
    product_id: (row as { product_id?: string | null }).product_id ?? null,
    description: (row as { description?: string }).description ?? "",
    quantity: Number((row as { quantity?: number }).quantity ?? 0),
    unit_price: (row as { unit_price?: number | null }).unit_price ?? null,
    unit_cost_snapshot:
      (row as { unit_cost_snapshot?: number | null }).unit_cost_snapshot ??
      (row as { unit_price?: number | null }).unit_price ??
      null,
    line_total: (row as { line_total?: number | null }).line_total ?? null,
    received_quantity: Number((row as { received_quantity?: number }).received_quantity ?? 0),
  }));

  const poLineIds = lines.map((line) => line.id);
  const { data: receiptRows } = poLineIds.length
    ? await scope.supabase
        .from("inventory_transactions")
        .select(
          "id, reference_id, quantity_change, unit_cost_snapshot, created_at, stock_location_id, stock_locations(name), transaction_type, notes"
        )
        .eq("reference_type", "purchase_order_line")
        .in("reference_id", poLineIds)
        .order("created_at", { ascending: false })
    : { data: [] as unknown[] };

  const lineById = new Map(lines.map((line) => [line.id, line]));
  const receivingHistory = (receiptRows ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const stockLocation = Array.isArray(record.stock_locations)
      ? (record.stock_locations as unknown[])[0]
      : record.stock_locations;
    const line = lineById.get((record.reference_id as string) ?? "");
    return {
      id: (record.id as string) ?? "",
      line_id: (record.reference_id as string) ?? "",
      line_description: line?.description ?? "PO line",
      quantity_received: Number(record.quantity_change ?? 0),
      unit_cost_snapshot: (record.unit_cost_snapshot as number | null) ?? null,
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      stock_location_name:
        stockLocation &&
        typeof stockLocation === "object" &&
        "name" in (stockLocation as Record<string, unknown>)
          ? ((stockLocation as { name?: string }).name ?? "Location")
          : "Location",
      transaction_type: (record.transaction_type as string | null) ?? null,
      notes: (record.notes as string | null) ?? null,
    };
  });

  const products = (productsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    sku: (row as { sku?: string | null }).sku ?? null,
  }));
  const stockLocations = (locationsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    location_type: (row as { location_type?: string | null }).location_type ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/purchase-orders" className="hover:text-[var(--foreground)]">
          Purchase Orders
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {purchaseOrder.po_number ?? purchaseOrder.id.slice(0, 8)}
        </span>
      </div>

      <header className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          {purchaseOrder.po_number ?? purchaseOrder.id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {purchaseOrder.company_name ?? "Company"} · {purchaseOrder.vendor_name ?? "Vendor"}
        </p>
        {purchaseOrder.notes ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">{purchaseOrder.notes}</p>
        ) : null}
      </header>

      <PurchaseOrderDetailView
        purchaseOrder={purchaseOrder}
        lines={lines}
        products={products}
        stockLocations={stockLocations}
        receivingHistory={receivingHistory}
      />
    </div>
  );
}
