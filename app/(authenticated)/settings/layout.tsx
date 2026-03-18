import { Settings } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  getTenantIdForUser,
  getMembershipRoleForUser,
  isDemoGuestUser,
  isPlatformSuperAdmin,
} from "@/src/lib/auth-context";
import { PageHeader } from "@/src/components/ui/page-header";

const settingsNav = [
  { label: "Company", href: "/settings/company" },
  { label: "Users", href: "/settings/users" },
  { label: "Roles & Permissions", href: "/settings/roles" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "AI usage", href: "/settings/ai-usage" },
  { label: "Tours", href: "/settings/tours" },
] as const;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isSuperAdmin = await isPlatformSuperAdmin(supabase);

  const tenantId = await getTenantIdForUser(supabase, user.id);
  if (!tenantId && !isSuperAdmin) redirect("/onboarding");

  const isDemoGuest = await isDemoGuestUser(supabase, user.id);
  // Super admins should be able to access Settings even if their membership is marked demo_guest.
  if (isDemoGuest && !isSuperAdmin) redirect("/operations");

  const role = await getMembershipRoleForUser(supabase, user.id);
  const canAccess = isSuperAdmin || role === "owner" || role === "admin";
  if (!canAccess) redirect("/operations");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Settings className="size-5" />}
        title="Settings"
        subtitle="Manage your organization, users, roles, and notifications."
      />
      <nav className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-4">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
