import Link from "next/link";
import { redirect } from "next/navigation";
import { FileStack } from "lucide-react";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { PageHeader } from "@/src/components/ui/page-header";
import { PurchaseOrderTemplatesList } from "../components/purchase-order-templates-list";

export const metadata = {
  title: "PO Templates | Cornerstone Tech",
  description: "Reusable purchase order templates",
};

export default async function PurchaseOrderTemplatesPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <PageHeader
          icon={<FileStack className="size-5" />}
          title="PO Templates"
          subtitle="Create a company first to use templates."
        />
      </div>
    );
  }

  const [templatesResult, vendorsResult] = await Promise.all([
    scope.supabase
      .from("purchase_order_templates")
      .select("id, company_id, vendor_id, name, notes, active, created_at, companies(name), vendors(name)")
      .in("company_id", scope.companyIds)
      .order("updated_at", { ascending: false }),
    scope.supabase
      .from("vendors")
      .select("id, name, company_id")
      .in("company_id", scope.companyIds)
      .order("name", { ascending: true }),
  ]);

  const templates = (templatesResult.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const company = Array.isArray(r.companies) ? (r.companies as unknown[])[0] : r.companies;
    const vendor = Array.isArray(r.vendors) ? (r.vendors as unknown[])[0] : r.vendors;
    return {
      id: r.id as string,
      company_id: r.company_id as string,
      vendor_id: (r.vendor_id as string | null) ?? null,
      name: (r.name as string) ?? "",
      notes: (r.notes as string | null) ?? null,
      active: (r.active as boolean) !== false,
      created_at: (r.created_at as string) ?? "",
      company_name:
        company && typeof company === "object" && "name" in (company as Record<string, unknown>)
          ? ((company as { name?: string }).name ?? undefined)
          : undefined,
      vendor_name:
        vendor && typeof vendor === "object" && "name" in (vendor as Record<string, unknown>)
          ? ((vendor as { name?: string }).name ?? undefined)
          : undefined,
    };
  });

  const [lineCountsResult] = await Promise.all([
    scope.supabase
      .from("purchase_order_template_lines")
      .select("template_id")
      .in(
        "template_id",
        templates.map((t) => t.id)
      ),
  ]);

  const countByTemplateId = new Map<string, number>();
  for (const row of lineCountsResult.data ?? []) {
    const tid = (row as { template_id: string }).template_id;
    countByTemplateId.set(tid, (countByTemplateId.get(tid) ?? 0) + 1);
  }

  const templatesWithCount = templates.map((t) => ({
    ...t,
    line_count: countByTemplateId.get(t.id) ?? 0,
  }));

  const vendors = (vendorsResult.data ?? []).map((v) => ({
    id: (v as { id: string }).id,
    name: (v as { name: string }).name,
    company_id: (v as { company_id: string }).company_id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileStack className="size-5" />}
        title="PO Templates"
        subtitle="Reusable templates for recurring purchase orders."
      />
      <div className="flex gap-2 text-sm text-[var(--muted)]">
        <Link href="/purchase-orders" className="hover:text-[var(--foreground)]">
          Purchase Orders
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">Templates</span>
      </div>
      <PurchaseOrderTemplatesList
        templates={templatesWithCount}
        companies={scope.companies}
        vendors={vendors}
      />
    </div>
  );
}
