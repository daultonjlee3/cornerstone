import { redirect } from "next/navigation";
import { isPlatformSuperAdmin } from "@/src/lib/auth-context";
import { getSupabaseClient } from "@/src/lib/auth-context";
import Link from "next/link";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseClient();
  const allowed = await isPlatformSuperAdmin(supabase);
  if (!allowed) redirect("/operations");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Platform Admin</h1>
          <Link
            href="/operations"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
