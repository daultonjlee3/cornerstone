import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentUser, getMembershipRoleForUser, isPlatformSuperAdmin } from "@/src/lib/auth-context";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [isSuper, role] = await Promise.all([
    isPlatformSuperAdmin(supabase),
    getMembershipRoleForUser(supabase, user.id),
  ]);
  const canManageOrg =
    isSuper || role === "owner" || role === "admin";
  redirect(canManageOrg ? "/settings/company" : "/settings/notifications");
}
