import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImpersonateButton } from "./impersonate-button";
import { WorkInTenantButton } from "../work-in-tenant-button";

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tenantId } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .order("name");

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role, users(id, full_name)")
    .eq("tenant_id", tenantId)
    .order("role");

  const tenantName = (tenant as { name: string }).name;
  const companyRows = (companies ?? []) as Array<{ id: string; name: string; status: string | null }>;
  const memberRows = (memberships ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const usersRaw = record.users;
    const userRecord = Array.isArray(usersRaw)
      ? (usersRaw[0] as Record<string, unknown> | undefined) ?? null
      : (usersRaw as Record<string, unknown> | null);
    return {
      user_id: String(record.user_id ?? ""),
      role: String(record.role ?? "member"),
      user: userRecord
        ? {
            id: String(userRecord.id ?? ""),
            full_name:
              userRecord.full_name == null ? null : String(userRecord.full_name),
          }
        : null,
    };
  });

  const { data: superAdminRows } = await supabase
    .from("platform_super_admins")
    .select("user_id");
  const superAdminIds = new Set((superAdminRows ?? []).map((r) => (r as { user_id: string }).user_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/platform/tenants"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Tenants
        </Link>
      </div>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Tenant
          </h2>
          <WorkInTenantButton tenantId={tenantId} />
        </div>
        <p className="font-medium text-[var(--foreground)]">{tenantName}</p>
        {(tenant as { slug?: string }).slug ? (
          <p className="text-xs text-[var(--muted)]">Slug: {(tenant as { slug: string }).slug}</p>
        ) : null}
      </section>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Companies
        </h2>
        {companyRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No companies in this tenant.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {companyRows.map((c) => (
              <li key={c.id} className="py-2 first:pt-0">
                <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                {c.status ? (
                  <span className="ml-2 rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {c.status}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Tenant users
        </h2>
        {memberRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No users in this tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-[var(--muted)]">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((m) => {
                  const userId = m.user_id;
                  const name = m.user?.full_name ?? "—";
                  const isSuperAdmin = superAdminIds.has(userId);
                  return (
                    <tr key={userId} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-2 pr-4 font-medium text-[var(--foreground)]">{name}</td>
                      <td className="py-2 pr-4 text-[var(--muted)]">{m.role}</td>
                      <td className="py-2">
                        {isSuperAdmin ? (
                          <span className="text-xs text-[var(--muted)]">Platform super admin</span>
                        ) : (
                          <ImpersonateButton userId={userId} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
