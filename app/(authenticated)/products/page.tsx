import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { ProductsList } from "./components/products-list";
import type { ProductRecord } from "./components/product-form-modal";

export const metadata = {
  title: "Products | Cornerstone Tech",
  description: "Parts master catalog",
};

export default async function ProductsPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Products</h1>
        <p className="text-sm text-[var(--muted)]">Create a company first to manage your parts catalog.</p>
      </div>
    );
  }

  const [productsResult, vendorsResult] = await Promise.all([
    scope.supabase
      .from("products")
      .select(
        "id, company_id, name, sku, description, category, unit_of_measure, default_vendor_id, default_cost, reorder_point_default, taxable_default, active, created_at, updated_at, companies(name), vendors!products_default_vendor_id_fkey(name)"
      )
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
    scope.supabase
      .from("vendors")
      .select("id, company_id, name")
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
  ]);

  const products = (productsResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    const defaultVendor = Array.isArray(record.vendors) ? record.vendors[0] : record.vendors;

    return {
      id: record.id as string,
      company_id: record.company_id as string,
      name: (record.name as string) ?? "Product",
      sku: (record.sku as string | null) ?? null,
      description: (record.description as string | null) ?? null,
      category: (record.category as string | null) ?? null,
      unit_of_measure: (record.unit_of_measure as string | null) ?? null,
      default_vendor_id: (record.default_vendor_id as string | null) ?? null,
      default_cost: (record.default_cost as number | null) ?? null,
      reorder_point_default: (record.reorder_point_default as number | null) ?? null,
      taxable_default: record.taxable_default !== false,
      active: Boolean(record.active),
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      updated_at: (record.updated_at as string) ?? new Date().toISOString(),
      company_name:
        company && typeof company === "object" && "name" in (company as Record<string, unknown>)
          ? ((company as { name?: string }).name ?? undefined)
          : undefined,
      default_vendor_name:
        defaultVendor &&
        typeof defaultVendor === "object" &&
        "name" in (defaultVendor as Record<string, unknown>)
          ? ((defaultVendor as { name?: string }).name ?? undefined)
          : undefined,
    } as ProductRecord;
  });

  const vendors = (vendorsResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
    company_id: (row as { company_id: string }).company_id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Products</h1>
        <p className="mt-1 text-[var(--muted)]">
          Master catalog for parts and materials used in work orders, inventory, and procurement.
        </p>
      </div>
      <ProductsList products={products} companies={scope.companies} vendors={vendors} />
    </div>
  );
}
