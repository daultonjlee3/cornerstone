import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemoGuestUser } from "@/src/lib/auth-context";

/** Shown when server actions reject writes for demo visitors (shared sample tenant). */
export const DEMO_READ_ONLY_ERROR =
  "You're signed in with demo visitor access. The company name in the header is sample data for this shared workspace—database changes are not saved. Start a free trial for your own organization.";

/**
 * Demo visitors (demo_guest only, no real tenant role) share seeded tenants, so writes are blocked.
 * Super admins and users with owner/admin/member/viewer/technician/etc. are not read-only here.
 */
export async function isDemoReadOnlyUser(supabase: SupabaseClient): Promise<boolean> {
  return isDemoGuestUser(supabase);
}
