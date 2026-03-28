import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemoGuestUser } from "@/src/lib/auth-context";

/** Shown when server actions reject writes for demo visitors (shared sample tenant). */
export const DEMO_READ_ONLY_ERROR =
  "You're signed in with demo visitor access. The company name in the header is sample data for this shared workspace—database changes are not saved. Start a free trial for your own organization.";

/**
 * Demo guests share seeded tenants, so all writes must be blocked to avoid
 * cross-visitor interference.
 */
export async function isDemoReadOnlyUser(supabase: SupabaseClient): Promise<boolean> {
  return isDemoGuestUser(supabase);
}
