/**
 * Optional helper to resolve user email/phone for notification delivery.
 * Uses Supabase Auth Admin (service role). Use when dispatching email/SMS to app users.
 */

export type ContactInfo = { email?: string | null; phone?: string | null };

/**
 * Returns a getContactForUser function that resolves email/phone via Auth Admin.
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export async function createGetContactForUser(): Promise<
  (userId: string) => Promise<ContactInfo>
> {
  const { createAdminClient } = await import("@/src/lib/supabase/admin");
  const admin = createAdminClient();
  return async (userId: string): Promise<ContactInfo> => {
    const {
      data: { user },
      error,
    } = await admin.auth.admin.getUserById(userId);
    if (error || !user) return { email: null, phone: null };
    return {
      email: user.email ?? null,
      phone: (user as { phone?: string | null }).phone ?? null,
    };
  };
}
