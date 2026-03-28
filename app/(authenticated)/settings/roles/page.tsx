import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";

const BUILT_IN_ROLES = [
  { key: "owner", label: "Tenant owner", description: "Full control of the organization, including billing and deletion." },
  { key: "admin", label: "Tenant admin", description: "Manage users, roles, and organization settings. Can impersonate users." },
  { key: "member", label: "Member", description: "Standard access to work orders, assets, and operations." },
  { key: "viewer", label: "Viewer", description: "Read-only access to most resources." },
] as const;

export default async function SettingsRolesPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/operations");
  const canManageOrg =
    ctx.isPlatformSuperAdmin ||
    ctx.membershipRole === "owner" ||
    ctx.membershipRole === "admin";
  if (!canManageOrg) redirect("/settings/notifications");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Built-in roles
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Your organization uses these roles. Permissions are fixed; custom role building is not available.
        </p>
        <ul className="space-y-4">
          {BUILT_IN_ROLES.map((r) => (
            <li
              key={r.key}
              className="rounded-lg border border-[var(--card-border)] p-3"
            >
              <p className="font-medium text-[var(--foreground)]">{r.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{r.description}</p>
              <code className="mt-2 inline-block rounded bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {r.key}
              </code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
