import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";

export default async function PlatformAdminPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, status, tenant_id")
    .order("name");

  const { count: workOrderCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true });

  const { count: userCount } = await supabase.from("users").select("id", { count: "exact", head: true });

  const rows = (companies ?? []) as Array<{
    id: string;
    name: string;
    status: string | null;
    tenant_id: string;
    tenants?: { name: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Platform tools
        </h2>
        <ul className="space-y-2">
          <li>
            <Link
              href="/platform/tenants"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Tenants
            </Link>
            <span className="ml-2 text-sm text-[var(--muted)]">— List and manage tenants, view users, impersonate</span>
          </li>
        </ul>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Usage summary
        </h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Companies / tenants</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">{rows.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Work orders (all)</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">{workOrderCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Users (platform)</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">{userCount ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Companies
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 first:pt-0">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{c.name}</p>
                  <p className="text-xs text-[var(--muted)]">Tenant ID: {c.tenant_id.slice(0, 8)}…</p>
                </div>
                <span className="rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  {c.status ?? "active"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
