import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

type ModuleLayoutProps = {
  children: React.ReactNode;
  moduleTitle: string;
  moduleHref: string;
};

export async function ModuleLayout({
  children,
  moduleTitle,
  moduleHref,
}: ModuleLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, tenants(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const tenantData = (membership as { tenants?: { name: string }[] | { name: string } | null })
    ?.tenants;
  const tenantName =
    (Array.isArray(tenantData) ? tenantData[0]?.name : tenantData?.name) ?? "Organization";

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("tenant_id", membership.tenant_id)
    .limit(1)
    .maybeSingle();

  const companyName = company?.name ?? "—";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Cornerstone Tech
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={moduleHref}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              {moduleTitle}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[var(--muted)] sm:inline" title="Tenant">
              {tenantName}
            </span>
            <span className="hidden text-sm text-[var(--muted)] sm:inline" title="Company">
              | {companyName}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
