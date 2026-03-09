import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { CrewsList } from "./components/crews-list";

export const metadata = {
  title: "Crews | Cornerstone Tech",
  description: "Teams & labor groups",
};

export default async function CrewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
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

  const tenantId = membership.tenant_id;
  const searchQuery = (await searchParams)?.q?.trim() ?? "";

  const { data: crewsRaw } = await supabase
    .from("crews")
    .select(`
      id, name, company_id, crew_lead_id, description, notes, is_active, updated_at,
      companies(name),
      technicians!crew_lead_id(technician_name, name)
    `)
    .eq("tenant_id", tenantId)
    .order("name");

  const crewIds = (crewsRaw ?? []).map((c) => (c as { id: string }).id);

  const memberCountByCrew: Record<string, number> = {};
  const woCountByCrew: Record<string, number> = {};
  crewIds.forEach((id) => {
    memberCountByCrew[id] = 0;
    woCountByCrew[id] = 0;
  });

  if (crewIds.length > 0) {
    const { data: members } = await supabase
      .from("crew_members")
      .select("crew_id")
      .in("crew_id", crewIds);
    (members ?? []).forEach((r) => {
      const cid = (r as { crew_id: string }).crew_id;
      memberCountByCrew[cid] = (memberCountByCrew[cid] ?? 0) + 1;
    });

    const { data: wos } = await supabase
      .from("work_orders")
      .select("assigned_crew_id")
      .in("assigned_crew_id", crewIds)
      .not("assigned_crew_id", "is", null);
    (wos ?? []).forEach((r) => {
      const cid = (r as { assigned_crew_id: string }).assigned_crew_id;
      if (cid) woCountByCrew[cid] = (woCountByCrew[cid] ?? 0) + 1;
    });
  }

  let crews = (crewsRaw ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const lead = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;
    const company_name =
      comp && typeof comp === "object" && "name" in comp ? (comp as { name?: string }).name : null;
    const crew_lead_name =
      lead && typeof lead === "object"
        ? (lead as { technician_name?: string }).technician_name ?? (lead as { name?: string }).name
        : null;
    const id = row.id as string;
    return {
      id,
      name: row.name,
      company_id: row.company_id,
      company_name: company_name ?? undefined,
      crew_lead_id: row.crew_lead_id,
      crew_lead_name: crew_lead_name ?? undefined,
      description: row.description,
      notes: row.notes,
      is_active: row.is_active !== false,
      updated_at: row.updated_at,
      member_count: memberCountByCrew[id] ?? 0,
      active_work_orders: woCountByCrew[id] ?? 0,
    };
  });

  if (searchQuery) {
    const term = searchQuery.toLowerCase();
    crews = crews.filter(
      (c) =>
        (c.name && String(c.name).toLowerCase().includes(term)) ||
        (c.company_name && String(c.company_name).toLowerCase().includes(term))
    );
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const { data: techniciansRaw } = await supabase
    .from("technicians")
    .select("id, technician_name, name, company_id")
    .in("company_id", (companies ?? []).map((c) => c.id))
    .eq("status", "active")
    .order("technician_name")
    .order("name");

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));
  const technicianOptions = (techniciansRaw ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? (t as { id: string }).id,
    company_id: (t as { company_id?: string }).company_id ?? null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Crews
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Teams & labor groups
        </p>
      </div>
      <CrewsList
        crews={crews}
        companies={companyOptions}
        technicians={technicianOptions}
        searchQuery={searchQuery}
      />
    </div>
  );
}
