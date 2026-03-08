import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Technician } from "./components/technician-form-modal";
import { TechniciansList } from "./components/technicians-list";

export const metadata = {
  title: "Technicians | Cornerstone Tech",
  description: "Manage technicians",
};

export default async function TechniciansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Technicians
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Manage technicians and assign them to work orders.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add technicians.</p>
        </div>
      </div>
    );
  }

  const { data: techniciansRaw, error } = await supabase
    .from("technicians")
    .select("id, technician_name, name, company_id, email, phone, trade, status, hourly_cost, notes, companies(name)")
    .in("company_id", companyIds)
    .order("technician_name")
    .order("name");

  const technicians = (techniciansRaw ?? []).map((t) => {
    const row = t as Record<string, unknown>;
    const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const company_name =
      comp && typeof comp === "object" && "name" in comp
        ? (comp as { name?: string }).name
        : null;
    const { companies: _, ...rest } = row;
    return {
      ...rest,
      company_name: company_name ?? undefined,
    };
  }) as (Technician & { company_name?: string })[];

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Technicians
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Manage technicians and assign them to work orders.
        </p>
      </div>
      <TechniciansList
        technicians={technicians}
        companies={companyOptions}
        error={error?.message ?? null}
      />
    </div>
  );
}
