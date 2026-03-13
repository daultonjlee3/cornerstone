import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { isAdminRole } from "@/src/lib/portal/access";
import { TechnicianImpersonationCard } from "../components/technician-impersonation-card";

export const metadata = {
  title: "Technician Profile | Cornerstone Tech",
  description: "Technician profile and admin impersonation controls",
};

export default async function TechnicianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) redirect("/onboarding");

  const { data: technician } = await supabase
    .from("technicians")
    .select(
      "id, technician_name, name, company_id, email, phone, trade, status, hourly_cost, notes, user_id, companies(name), users(is_portal_only)"
    )
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id)
    .limit(1)
    .maybeSingle();
  if (!technician) notFound();

  const row = technician as {
    id: string;
    technician_name?: string | null;
    name?: string | null;
    company_id?: string | null;
    email?: string | null;
    phone?: string | null;
    trade?: string | null;
    status?: string | null;
    hourly_cost?: number | null;
    notes?: string | null;
    user_id?: string | null;
    companies?: { name?: string | null }[] | { name?: string | null } | null;
    users?: { is_portal_only?: boolean | null }[] | { is_portal_only?: boolean | null } | null;
  };

  const companyName = Array.isArray(row.companies)
    ? row.companies[0]?.name ?? "—"
    : row.companies?.name ?? "—";
  const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;
  const isPortalOnly = Boolean(userInfo?.is_portal_only);
  const hasLinkedLogin = Boolean(row.user_id);
  const displayName = row.technician_name ?? row.name ?? "Technician";
  const canImpersonate = isAdminRole(membership.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/technicians" className="hover:text-[var(--foreground)]">
          Technicians
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{displayName}</span>
      </div>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{displayName}</h1>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Company</dt>
            <dd className="text-sm text-[var(--foreground)]">{companyName}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Status</dt>
            <dd className="text-sm text-[var(--foreground)]">{row.status ?? "active"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Email</dt>
            <dd className="text-sm text-[var(--foreground)]">{row.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Phone</dt>
            <dd className="text-sm text-[var(--foreground)]">{row.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Trade</dt>
            <dd className="text-sm text-[var(--foreground)]">{row.trade ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Hourly Cost</dt>
            <dd className="text-sm text-[var(--foreground)]">
              {row.hourly_cost != null ? `$${row.hourly_cost.toFixed(2)}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Linked Login</dt>
            <dd className="text-sm text-[var(--foreground)]">
              {hasLinkedLogin ? `Yes (${isPortalOnly ? "Portal-only" : "Standard"})` : "No"}
            </dd>
          </div>
        </dl>
        {row.notes ? (
          <p className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
            {row.notes}
          </p>
        ) : null}
      </section>

      <TechnicianImpersonationCard
        technicianId={row.id}
        technicianName={displayName}
        canImpersonate={canImpersonate}
        hasLinkedLogin={hasLinkedLogin}
      />
    </div>
  );
}
