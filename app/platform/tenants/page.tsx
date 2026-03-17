import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { WorkInTenantButton } from "./work-in-tenant-button";
import { ClearActingTenantButton } from "./clear-acting-tenant-button";

type SearchParams = { switch?: string };

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const switchMode = params?.switch === "1";
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, created_at")
    .order("name");

  const rows = (tenants ?? []) as Array<{
    id: string;
    name: string;
    slug: string | null;
    created_at: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/platform"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Platform
        </Link>
      </div>
      {switchMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
          <p className="text-sm text-[var(--foreground)]">
            Select a tenant to work in. You’ll see that tenant’s data in the app until you switch again.
          </p>
          <ClearActingTenantButton />
        </div>
      ) : null}
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Tenants
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No tenants yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
              >
                <div>
                  <Link
                    href={`/platform/tenants/${t.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {t.name}
                  </Link>
                  {t.slug ? (
                    <p className="text-xs text-[var(--muted)]">Slug: {t.slug}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <WorkInTenantButton tenantId={t.id} />
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
