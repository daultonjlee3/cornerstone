import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { PageHeader } from "@/src/components/ui/page-header";
import { FileStack } from "lucide-react";
import { NewPurchaseOrderTemplateForm } from "../../components/new-purchase-order-template-form";

export const metadata = {
  title: "New PO Template | Cornerstone Tech",
  description: "Create a reusable purchase order template",
};

export default async function NewTemplatePage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) redirect("/purchase-orders/templates");

  const [vendorsResult, productsResult] = await Promise.all([
    scope.supabase
      .from("vendors")
      .select("id, name, company_id")
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
    scope.supabase
      .from("products")
      .select("id, name, sku, company_id")
      .in("company_id", scope.companyIds)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const vendors = (vendorsResult.data ?? []).map((v) => ({
    id: (v as { id: string }).id,
    name: (v as { name: string }).name,
    company_id: (v as { company_id: string }).company_id,
  }));
  const products = (productsResult.data ?? []).map((p) => ({
    id: (p as { id: string }).id,
    name: (p as { name: string }).name,
    sku: (p as { sku?: string | null }).sku ?? null,
    company_id: (p as { company_id?: string }).company_id ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileStack className="size-5" />}
        title="New PO Template"
        subtitle="Create a reusable template for purchase orders."
      />
      <div className="flex gap-2 text-sm text-[var(--muted)]">
        <Link href="/purchase-orders" className="hover:text-[var(--foreground)]">
          Purchase Orders
        </Link>
        <span>/</span>
        <Link href="/purchase-orders/templates" className="hover:text-[var(--foreground)]">
          Templates
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">New</span>
      </div>
      <NewPurchaseOrderTemplateForm companies={scope.companies} vendors={vendors} products={products} />
    </div>
  );
}
