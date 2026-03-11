import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { SignOutButton } from "@/app/components/sign-out-button";

export default async function TechnicianPortalLayout({
  children,
}: {
  children: React.ReactNode;
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Technician Portal
            </p>
            <h1 className="text-base font-semibold">Field Work Execution</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">{children}</main>

      <nav className="sticky bottom-0 z-30 border-t border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 px-3 py-2 sm:px-4">
          <Link
            href="/technician/work"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-center text-sm font-medium"
          >
            Workspace
          </Link>
          <Link
            href="/dispatch"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-center text-sm font-medium"
          >
            Dispatch
          </Link>
        </div>
      </nav>
    </div>
  );
}
