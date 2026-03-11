import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export const metadata = {
  title: "Product Detail | Cornerstone Tech",
  description: "Product inventory and usage history",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  const { data: productRow } = await scope.supabase
    .from("products")
    .select("id, company_id, name, sku, description, category, unit_of_measure, default_cost, reorder_point_default, active, default_vendor_id, vendors!products_default_vendor_id_fkey(name), companies(name)")
    .eq("id", id)
    .maybeSingle();
  if (!productRow) notFound();

  const companyId = (productRow as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !scope.companyIds.includes(companyId)) notFound();

  const [balancesResult, usageResult] = await Promise.all([
    scope.supabase
      .from("inventory_balances")
      .select("id, quantity_on_hand, reorder_point, minimum_stock, stock_locations(id, name, location_type)")
      .eq("product_id", id)
      .order("updated_at", { ascending: false }),
    scope.supabase
      .from("work_order_part_usage")
      .select("id, quantity_used, total_cost, used_at, work_order_id, work_orders(work_order_number, title)")
      .eq("product_id", id)
      .order("used_at", { ascending: false })
      .limit(20),
  ]);

  const companyObj = Array.isArray((productRow as Record<string, unknown>).companies)
    ? ((productRow as Record<string, unknown>).companies as unknown[])[0]
    : (productRow as Record<string, unknown>).companies;
  const vendorObj = Array.isArray((productRow as Record<string, unknown>).vendors)
    ? ((productRow as Record<string, unknown>).vendors as unknown[])[0]
    : (productRow as Record<string, unknown>).vendors;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/products" className="hover:text-[var(--foreground)]">
          Products
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{(productRow as { name?: string }).name ?? "Product"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{(productRow as { name?: string }).name ?? "Product"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">SKU</p>
                <p className="mt-1 text-[var(--foreground)]">{(productRow as { sku?: string | null }).sku ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Category</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(productRow as { category?: string | null }).category ?? "Uncategorized"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Unit of measure</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(productRow as { unit_of_measure?: string | null }).unit_of_measure ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Default vendor</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {vendorObj && typeof vendorObj === "object" && "name" in (vendorObj as Record<string, unknown>)
                    ? ((vendorObj as { name?: string }).name ?? "—")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Default cost</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(productRow as { default_cost?: number | null }).default_cost != null
                    ? `$${Number((productRow as { default_cost?: number }).default_cost).toFixed(2)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Reorder point default</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(productRow as { reorder_point_default?: number | null }).reorder_point_default ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Company</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {companyObj && typeof companyObj === "object" && "name" in (companyObj as Record<string, unknown>)
                    ? ((companyObj as { name?: string }).name ?? "—")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
                <p className="mt-1 text-[var(--foreground)]">
                  {(productRow as { active?: boolean }).active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            {(productRow as { description?: string | null }).description ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">
                  {(productRow as { description?: string | null }).description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Tracked locations</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {(balancesResult.data ?? []).length}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Total on hand</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {Number(
                  (balancesResult.data ?? []).reduce(
                    (sum, row) => sum + Number((row as { quantity_on_hand?: number }).quantity_on_hand ?? 0),
                    0
                  )
                ).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(balancesResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No location-level inventory balances yet.</p>
            ) : (
              (balancesResult.data ?? []).map((row) => {
                const location = Array.isArray((row as Record<string, unknown>).stock_locations)
                  ? ((row as Record<string, unknown>).stock_locations as unknown[])[0]
                  : (row as Record<string, unknown>).stock_locations;
                const quantity = Number((row as { quantity_on_hand?: number | null }).quantity_on_hand ?? 0);
                const reorder = Number((row as { reorder_point?: number | null }).reorder_point ?? 0);
                const lowStock = reorder > 0 && quantity < reorder;
                return (
                  <div
                    key={(row as { id: string }).id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      lowStock
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-[var(--card-border)] bg-[var(--background)]/50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {location && typeof location === "object" && "name" in (location as Record<string, unknown>)
                          ? ((location as { name?: string }).name ?? "Location")
                          : "Location"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {location && typeof location === "object" && "location_type" in (location as Record<string, unknown>)
                          ? ((location as { location_type?: string }).location_type ?? "other").replace(/_/g, " ")
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--foreground)]">{quantity}</p>
                      <p className="text-xs text-[var(--muted)]">Reorder {reorder || "—"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(usageResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No work order usage recorded yet.</p>
            ) : (
              (usageResult.data ?? []).map((row) => {
                const workOrder = Array.isArray((row as Record<string, unknown>).work_orders)
                  ? ((row as Record<string, unknown>).work_orders as unknown[])[0]
                  : (row as Record<string, unknown>).work_orders;
                return (
                  <Link
                    key={(row as { id: string }).id}
                    href={`/work-orders/${(row as { work_order_id: string }).work_order_id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--background)]/60"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {workOrder && typeof workOrder === "object" && "work_order_number" in (workOrder as Record<string, unknown>)
                          ? ((workOrder as { work_order_number?: string | null }).work_order_number ?? "Work order")
                          : "Work order"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {workOrder && typeof workOrder === "object" && "title" in (workOrder as Record<string, unknown>)
                          ? ((workOrder as { title?: string | null }).title ?? "—")
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--foreground)]">
                        -{Number((row as { quantity_used?: number }).quantity_used ?? 0)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {(row as { used_at?: string | null }).used_at
                          ? new Date((row as { used_at: string }).used_at).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
