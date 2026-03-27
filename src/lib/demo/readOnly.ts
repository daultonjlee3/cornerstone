import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemoGuestUser } from "@/src/lib/auth-context";

export const DEMO_READ_ONLY_ERROR =
  "This live demo workspace is read-only. Start a free trial to save changes.";

/**
 * Demo guests share seeded tenants, so all writes must be blocked to avoid
 * cross-visitor interference.
 */
export async function isDemoReadOnlyUser(supabase: SupabaseClient): Promise<boolean> {
  return isDemoGuestUser(supabase);
}
