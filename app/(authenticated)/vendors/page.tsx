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
    .select("id, company_id, name, service_type, contact_name, email, phone, address, website, notes, preferred_vendor, created_at, updated_at, companies(name)")
    .in("company_id", scope.companyIds)
    .order("preferred_vendor", { ascending: false })
    .order("name", { ascending: true });

  const vendorIds = (data ?? []).map((row) => (row as { id: string }).id);
  const { data: vendorWorkOrders } = vendorIds.length
    ? await scope.supabase
        .from("work_orders")
        .select("vendor_id, status, response_time_minutes, vendor_cost")
        .in("vendor_id", vendorIds)
    : { data: [] as unknown[] };
  const metricsByVendorId = new Map<
    string,
    {
      jobs_completed: number;
      total_response_minutes: number;
      response_count: number;
      total_vendor_cost: number;
    }
  >();
  for (const row of vendorWorkOrders ?? []) {
    const record = row as {
      vendor_id?: string | null;
      status?: string | null;
      response_time_minutes?: number | null;
      vendor_cost?: number | null;
    };
    const vendorId = record.vendor_id ?? null;
    if (!vendorId) continue;
    const entry =
      metricsByVendorId.get(vendorId) ?? {
        jobs_completed: 0,
        total_response_minutes: 0,
        response_count: 0,
        total_vendor_cost: 0,
      };
    if (record.status === "completed") {
      entry.jobs_completed += 1;
      if (typeof record.response_time_minutes === "number" && Number.isFinite(record.response_time_minutes)) {
        entry.total_response_minutes += Math.max(0, record.response_time_minutes);
        entry.response_count += 1;
      }
      if (typeof record.vendor_cost === "number" && Number.isFinite(record.vendor_cost)) {
        entry.total_vendor_cost += Math.max(0, record.vendor_cost);
      }
    }
    metricsByVendorId.set(vendorId, entry);
  }

  const vendors = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    return {
      id: record.id as string,
      company_id: record.company_id as string,
      name: (record.name as string) ?? "Vendor",
      service_type: (record.service_type as string | null) ?? null,
      contact_name: (record.contact_name as string | null) ?? null,
      email: (record.email as string | null) ?? null,
      phone: (record.phone as string | null) ?? null,
      address: (record.address as string | null) ?? null,
      website: (record.website as string | null) ?? null,
      notes: (record.notes as string | null) ?? null,
      preferred_vendor: Boolean(record.preferred_vendor),
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      updated_at: (record.updated_at as string) ?? new Date().toISOString(),
      jobs_completed: metricsByVendorId.get(record.id as string)?.jobs_completed ?? 0,
      average_response_time_minutes: (() => {
        const entry = metricsByVendorId.get(record.id as string);
        if (!entry || entry.response_count === 0) return null;
        return Math.round(entry.total_response_minutes / entry.response_count);
      })(),
      total_vendor_cost:
        metricsByVendorId.get(record.id as string)?.total_vendor_cost ?? 0,
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
