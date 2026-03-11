import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { VendorsList } from "./components/vendors-list";
import type { VendorRecord } from "./components/vendor-form-modal";

export const metadata = {
  title: "Vendors | Cornerstone Tech",
  description: "Supplier management",
};

export default async function VendorsPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Vendors</h1>
        <p className="text-sm text-[var(--muted)]">Create a company first to manage suppliers and procurement.</p>
      </div>
    );
  }

  const { data } = await scope.supabase
    .from("vendors")
    .select("id, company_id, name, contact_name, email, phone, address, website, notes, preferred_vendor, created_at, updated_at, companies(name)")
    .in("company_id", scope.companyIds)
    .order("preferred_vendor", { ascending: false })
    .order("name", { ascending: true });

  const vendors = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    return {
      id: record.id as string,
      company_id: record.company_id as string,
      name: (record.name as string) ?? "Vendor",
      contact_name: (record.contact_name as string | null) ?? null,
      email: (record.email as string | null) ?? null,
      phone: (record.phone as string | null) ?? null,
      address: (record.address as string | null) ?? null,
      website: (record.website as string | null) ?? null,
      notes: (record.notes as string | null) ?? null,
      preferred_vendor: Boolean(record.preferred_vendor),
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      updated_at: (record.updated_at as string) ?? new Date().toISOString(),
      company_name:
        company && typeof company === "object" && "name" in (company as Record<string, unknown>)
          ? ((company as { name?: string }).name ?? undefined)
          : undefined,
    } as VendorRecord;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Vendors</h1>
        <p className="mt-1 text-[var(--muted)]">
          Manage supplier profiles used by products and purchase orders.
        </p>
      </div>
      <VendorsList vendors={vendors} companies={scope.companies} />
    </div>
  );
}
