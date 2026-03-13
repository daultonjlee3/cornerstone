import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { SignOutButton } from "@/app/components/sign-out-button";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";
import { endTechnicianImpersonationAction } from "@/app/(authenticated)/technicians/impersonation-actions";
import { PortalLocationTracker } from "./components/portal-location-tracker";
import { RestoreMainAppButton } from "./components/restore-main-app-button";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context) redirect("/login");
  if (!context.isPortalOnlyUser && !context.impersonation) {
    redirect("/dashboard");
  }

  const technicianName = context.technicianName ?? "Technician";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Technician Portal
            </p>
            <h1 className="text-base font-semibold">{technicianName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {context.impersonation ? (
              <form action={endTechnicianImpersonationAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]"
                >
                  Back to main app
                </button>
              </form>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]"
                >
                  Back to main app
                </Link>
                <RestoreMainAppButton />
                {!context.isAdmin ? (
                  <p className="hidden text-xs text-[var(--muted)] sm:block">
                    Need full app access? Contact your administrator.
                  </p>
                ) : null}
              </>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      {context.impersonation ? (
        <section className="border-b border-[var(--card-border)] bg-indigo-50/80">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
            <p className="text-sm font-medium text-indigo-800">
              Impersonating Technician: {technicianName}
            </p>
            <form action={endTechnicianImpersonationAction}>
              <button
                type="submit"
                className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Back to main app
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <PortalLocationTracker active={Boolean(context.technicianId)} />

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">{children}</main>

      <nav className="sticky bottom-0 z-30 border-t border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5 gap-2 px-3 py-2 sm:px-4">
          <Link
            href="/portal/work-orders"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-center text-xs font-medium"
          >
            Work
          </Link>
          <Link
            href="/portal/schedule"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-center text-xs font-medium"
          >
            Schedule
          </Link>
          <Link
            href="/portal/map"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-center text-xs font-medium"
          >
            Map
          </Link>
          <Link
            href="/portal/profile"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-center text-xs font-medium"
          >
            Profile
          </Link>
          <Link
            href="/portal"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 text-center text-xs font-medium"
          >
            Home
          </Link>
        </div>
      </nav>
    </div>
  );
}
