import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

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
    .select("id, company_id, name, contact_name, email, phone, address, website, notes, preferred_vendor, created_at, updated_at, companies(name)")
    .eq("id", id)
    .maybeSingle();
  if (!vendorRow) notFound();

  const vendorCompanyId = (vendorRow as { company_id?: string | null }).company_id ?? null;
  if (!vendorCompanyId || !scope.companyIds.includes(vendorCompanyId)) notFound();

  const [productsResult, purchaseOrdersResult] = await Promise.all([
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
  ]);

  const companyObj = Array.isArray((vendorRow as Record<string, unknown>).companies)
    ? ((vendorRow as Record<string, unknown>).companies as unknown[])[0]
    : (vendorRow as Record<string, unknown>).companies;

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
    </div>
  );
}
