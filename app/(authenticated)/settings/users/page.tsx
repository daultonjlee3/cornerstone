import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";
import { UsersTable } from "./users-table";

export default async function SettingsUsersPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  const tenantId = ctx.tenantId;
  if (!tenantId) redirect("/dashboard");

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role, users(id, full_name)")
    .eq("tenant_id", tenantId)
    .order("role");

  const memberRows = (memberships ?? []) as Array<{
    user_id: string;
    role: string;
    users: { id: string; full_name: string | null } | null;
  }>;

  const { data: superAdminRows } = await supabase
    .from("platform_super_admins")
    .select("user_id");
  const superAdminIds = new Set((superAdminRows ?? []).map((r) => (r as { user_id: string }).user_id));

  const canImpersonate = ctx.membershipRole === "owner" || ctx.membershipRole === "admin";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Users
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Invite, edit, deactivate, or impersonate users in your organization. Only owners and admins can impersonate.
        </p>
        <UsersTable
          members={memberRows.map((m) => ({
            userId: m.user_id,
            fullName: m.users?.full_name ?? "—",
            role: m.role,
            isPlatformSuperAdmin: superAdminIds.has(m.user_id),
          }))}
          canImpersonate={canImpersonate}
        />
      </section>
    </div>
  );
}
