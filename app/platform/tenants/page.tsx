import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";

export default async function PlatformTenantsPage() {
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
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Tenants
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No tenants yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 first:pt-0">
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
                <span className="text-xs text-[var(--muted)]">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
