/**
 * Impersonation session: cookie-based state and server-side helpers.
 * Cookie stores acting_as_user_id; original user is always auth.getUser().
 * Permissions and tenant resolution use the effective (acting) user when impersonating.
 */

import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "cornerstone_impersonation";

export type ImpersonationState = {
  originalUserId: string;
  actingAsUserId: string;
  startedAt: string;
};

function parseCookie(value: string | undefined): { actingAsUserId: string; startedAt: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { actingAsUserId?: string; startedAt?: string };
    if (typeof parsed?.actingAsUserId === "string" && typeof parsed?.startedAt === "string") {
      return { actingAsUserId: parsed.actingAsUserId, startedAt: parsed.startedAt };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Read impersonation state from cookie. Original user must be obtained from auth.getUser() separately. */
export async function getImpersonationStateFromCookie(): Promise<Omit<ImpersonationState, "originalUserId"> | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  return parseCookie(value);
}

/** Set impersonation cookie (call from Server Action after validation). */
export async function setImpersonationCookie(actingAsUserId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify({ actingAsUserId, startedAt: new Date().toISOString() }), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

/** Clear impersonation cookie (call from Server Action on "Return to My Profile"). */
export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}

/** Get effective user ID for the current request: acting-as if impersonating, else auth user id. */
export async function getEffectiveUserId(authUserId: string): Promise<string> {
  const state = await getImpersonationStateFromCookie();
  if (state?.actingAsUserId) return state.actingAsUserId;
  return authUserId;
}
