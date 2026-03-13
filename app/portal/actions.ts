"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * Allowlisted emails that can use "Restore main app access" from the technician portal.
 * Set PORTAL_RESTORE_ACCESS_EMAILS in .env.local (comma-separated, case-insensitive).
 * Example: PORTAL_RESTORE_ACCESS_EMAILS=james@example.com,admin@company.com
 */
function isAllowedToRestoreAccess(email: string | null | undefined): boolean {
  const raw = process.env.PORTAL_RESTORE_ACCESS_EMAILS?.trim();
  if (!raw || !email) return false;
  const allowed = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return allowed.has(email.trim().toLowerCase());
}

/**
 * Restore main app access for the current user: set is_portal_only = false and
 * tenant role to owner. Only allowed if the user's email is in PORTAL_RESTORE_ACCESS_EMAILS.
 */
export async function restoreMainAppAccessAction(
  _prev?: { error?: string } | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/login");
  }

  if (!isAllowedToRestoreAccess(user.email)) {
    return {
      error:
        "Your email is not allowed to restore access from here. Add it to PORTAL_RESTORE_ACCESS_EMAILS in .env.local, or ask an admin to run the SQL fix.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Server is missing Supabase admin config (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
    };
  }
  const userId = user.id;

  const { data: membership } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const tenantId = (membership as { tenant_id?: string } | null)?.tenant_id;

  await admin.from("users").update({ is_portal_only: false }).eq("id", userId);
  if (tenantId) {
    await admin
      .from("tenant_memberships")
      .update({ role: "owner" })
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);
  }

  redirect("/dashboard");
}
