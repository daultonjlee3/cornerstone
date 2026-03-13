import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";

export const metadata = {
  title: "Portal Profile | Cornerstone Tech",
  description: "Technician portal profile",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default async function PortalProfilePage() {
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context) redirect("/login");
  if (!context.actingAsTechnician || !context.technicianId) {
    redirect("/dashboard");
  }

  const { data: technician } = await supabase
    .from("technicians")
    .select(
      "id, technician_name, name, email, phone, trade, status, notes, current_latitude, current_longitude, last_location_at, companies(name)"
    )
    .eq("id", context.technicianId)
    .limit(1)
    .maybeSingle();

  const row = technician as
    | {
        technician_name?: string | null;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        trade?: string | null;
        status?: string | null;
        notes?: string | null;
        current_latitude?: number | null;
        current_longitude?: number | null;
        last_location_at?: string | null;
        companies?: { name?: string | null }[] | { name?: string | null } | null;
      }
    | null;

  const companyName = row
    ? Array.isArray(row.companies)
      ? row.companies[0]?.name ?? "—"
      : row.companies?.name ?? "—"
    : "—";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">My Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Portal access and live location status.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Name</dt>
            <dd className="text-sm text-[var(--foreground)]">
              {row?.technician_name ?? row?.name ?? context.technicianName ?? "Technician"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Company</dt>
            <dd className="text-sm text-[var(--foreground)]">{companyName}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Email</dt>
            <dd className="text-sm text-[var(--foreground)]">{row?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Phone</dt>
            <dd className="text-sm text-[var(--foreground)]">{row?.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Trade</dt>
            <dd className="text-sm text-[var(--foreground)]">{row?.trade ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Status</dt>
            <dd className="text-sm text-[var(--foreground)]">{row?.status ?? "active"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Last known location</dt>
            <dd className="text-sm text-[var(--foreground)]">
              {row?.current_latitude != null && row?.current_longitude != null
                ? `${row.current_latitude.toFixed(5)}, ${row.current_longitude.toFixed(5)}`
                : "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Last updated</dt>
            <dd className="text-sm text-[var(--foreground)]">
              {formatDateTime(row?.last_location_at ?? null)}
            </dd>
          </div>
        </dl>
        {row?.notes ? (
          <p className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
            {row.notes}
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link
          href="/portal/map"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-3 text-center text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          View Map
        </Link>
        <Link
          href="/portal/work-orders"
          className="rounded-xl bg-[var(--accent)] px-3 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
        >
          My Work
        </Link>
      </section>
    </div>
  );
}
