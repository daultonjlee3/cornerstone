import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { VendorPriceCatalog } from "../components/vendor-price-catalog";

export const metadata = {
  title: "Vendor Detail | Cornerstone Tech",
  description: "Vendor detail and procurement activity",
};

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  const { data: vendorRow } = await scope.supabase
    .from("vendors")
    .select("id, company_id, name, service_type, contact_name, email, phone, address, website, notes, preferred_vendor, created_at, updated_at, companies(name)")
    .eq("id", id)
    .maybeSingle();
  if (!vendorRow) notFound();

  const vendorCompanyId = (vendorRow as { company_id?: string | null }).company_id ?? null;
  if (!vendorCompanyId || !scope.companyIds.includes(vendorCompanyId)) notFound();

  const [productsResult, purchaseOrdersResult, vendorWorkOrdersResult, vendorPricingResult, companyProductsResult] =
    await Promise.all([
      scope.supabase
        .from("products")
        .select("id, name, sku, active")
        .eq("default_vendor_id", id)
        .order("name", { ascending: true })
        .limit(10),
      scope.supabase
        .from("purchase_orders")
        .select("id, po_number, status, order_date, expected_delivery_date, total_cost")
        .eq("vendor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      scope.supabase
        .from("work_orders")
        .select("status, response_time_minutes, vendor_cost")
        .eq("vendor_id", id),
      scope.supabase
        .from("vendor_pricing")
        .select("id, vendor_id, product_id, vendor_item_name, vendor_sku, unit_cost, taxable_override, preferred, lead_time_days, notes, products(name, sku, taxable_default)")
        .eq("vendor_id", id)
        .order("updated_at", { ascending: false }),
      scope.supabase
        .from("products")
        .select("id, name, sku, taxable_default")
        .eq("company_id", vendorCompanyId)
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

  const vendorMetrics = (vendorWorkOrdersResult.data ?? []).reduce(
    (acc, row) => {
      const record = row as {
        status?: string | null;
        response_time_minutes?: number | null;
        vendor_cost?: number | null;
      };
      if (record.status === "completed") {
        acc.jobsCompleted += 1;
        if (typeof record.response_time_minutes === "number" && Number.isFinite(record.response_time_minutes)) {
          acc.responseMinutes += Math.max(0, record.response_time_minutes);
          acc.responseCount += 1;
        }
        if (typeof record.vendor_cost === "number" && Number.isFinite(record.vendor_cost)) {
          acc.totalVendorCost += Math.max(0, record.vendor_cost);
        }
      }
      return acc;
    },
    {
      jobsCompleted: 0,
      responseMinutes: 0,
      responseCount: 0,
      totalVendorCost: 0,
    }
  );
  const averageResponseMinutes =
    vendorMetrics.responseCount > 0
      ? Math.round(vendorMetrics.responseMinutes / vendorMetrics.responseCount)
      : null;
  const formatMinutes = (minutes: number | null) => {
    if (minutes == null) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  };

  const companyObj = Array.isArray((vendorRow as Record<string, unknown>).companies)
    ? ((vendorRow as Record<string, unknown>).companies as unknown[])[0]
    : (vendorRow as Record<string, unknown>).companies;

  const pricingEntries = (vendorPricingResult.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const product = Array.isArray(r.products) ? (r.products as unknown[])[0] : r.products;
    const p = product as Record<string, unknown> | null;
    return {
      id: r.id as string,
      vendor_id: r.vendor_id as string,
      product_id: r.product_id as string,
      vendor_item_name: (r.vendor_item_name as string | null) ?? null,
      vendor_sku: (r.vendor_sku as string | null) ?? null,
      unit_cost: Number(r.unit_cost ?? 0),
      taxable_override: r.taxable_override as boolean | null,
      preferred: Boolean(r.preferred),
      lead_time_days: (r.lead_time_days as number | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      product_name: p?.name as string | undefined,
      product_sku: (p?.sku as string | null) ?? null,
      product_taxable_default: p?.taxable_default !== false,
    };
  });

  const companyProducts = (companyProductsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    sku: (row as { sku?: string | null }).sku ?? null,
    taxable_default: (row as { taxable_default?: boolean }).taxable_default !== false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/vendors" className="hover:text-[var(--foreground)]">
          Vendors
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{(vendorRow as { name?: string }).name ?? "Vendor"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{(vendorRow as { name?: string }).name ?? "Vendor"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Company</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {companyObj && typeof companyObj === "object" && "name" in (companyObj as Record<string, unknown>)
                    ? ((companyObj as { name?: string }).name ?? "—")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Preferred</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { preferred_vendor?: boolean }).preferred_vendor ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Contact</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { contact_name?: string | null }).contact_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Service type</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { service_type?: string | null }).service_type ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Phone</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { phone?: string | null }).phone ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Email</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { email?: string | null }).email ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Website</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(vendorRow as { website?: string | null }).website ?? "—"}
                </p>
              </div>
            </div>
            {(vendorRow as { address?: string | null }).address ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Address</p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">
                  {(vendorRow as { address?: string | null }).address}
                </p>
              </div>
            ) : null}
            {(vendorRow as { notes?: string | null }).notes ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">
                  {(vendorRow as { notes?: string | null }).notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Products linked</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {productsResult.data?.length ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Jobs completed</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {vendorMetrics.jobsCompleted}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Avg response time</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {formatMinutes(averageResponseMinutes)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Total vendor cost</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                ${vendorMetrics.totalVendorCost.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Recent purchase orders</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {purchaseOrdersResult.data?.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(productsResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No products currently use this vendor as default.</p>
            ) : (
              (productsResult.data ?? []).map((row) => (
                <Link
                  key={(row as { id: string }).id}
                  href={`/products/${(row as { id: string }).id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--background)]/60"
                >
                  <span>
                    {(row as { name?: string }).name ?? "Product"}
                    {(row as { sku?: string | null }).sku ? (
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {(row as { sku?: string | null }).sku}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {(row as { active?: boolean }).active ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(purchaseOrdersResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No purchase orders have been created for this vendor yet.</p>
            ) : (
              (purchaseOrdersResult.data ?? []).map((row) => (
                <Link
                  key={(row as { id: string }).id}
                  href={`/purchase-orders/${(row as { id: string }).id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--background)]/60"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {(row as { po_number?: string | null }).po_number ?? "PO"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {(row as { status?: string | null }).status?.replace(/_/g, " ") ?? "draft"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--foreground)]">
                      ${Number((row as { total_cost?: number | null }).total_cost ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {(row as { order_date?: string | null }).order_date ?? "No order date"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <VendorPriceCatalog
        vendorId={id}
        vendorName={(vendorRow as { name?: string }).name ?? "Vendor"}
        companyId={vendorCompanyId}
        entries={pricingEntries}
        products={companyProducts}
      />
    </div>
  );
}
