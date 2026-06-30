import type { SupabaseClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { createAdminClient, isAdminClientConfigError } from "@/src/lib/supabase/admin";

export const SESSION_REPLACED_LOGIN_REASON = "session_replaced";

type JwtPayload = { session_id?: string; sub?: string };

export function getSessionIdFromAccessToken(accessToken: string): string | null {
  const decoded = jwt.decode(accessToken) as JwtPayload | null;
  const sessionId = decoded?.session_id;
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null;
}

export type ActiveSessionStatus = "valid" | "stale" | "unknown";

export async function getActiveSessionIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("active_auth_session_id")
    .eq("id", userId)
    .maybeSingle();

  const activeId = (data as { active_auth_session_id?: string | null } | null)
    ?.active_auth_session_id;
  return typeof activeId === "string" && activeId.length > 0 ? activeId : null;
}

export async function validateActiveSession(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string
): Promise<ActiveSessionStatus> {
  const sessionId = getSessionIdFromAccessToken(accessToken);
  if (!sessionId) return "unknown";

  const activeId = await getActiveSessionIdForUser(supabase, userId);
  if (!activeId) return "valid";
  if (activeId === sessionId) return "valid";
  return "stale";
}

async function persistActiveSessionId(userId: string, sessionId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("users")
      .update({ active_auth_session_id: sessionId })
      .eq("id", userId);
    if (error) {
      console.warn("[auth] Failed to persist active session (admin):", error.message);
    }
    return;
  } catch (error) {
    if (!isAdminClientConfigError(error)) {
      console.warn("[auth] Admin client unavailable for active session:", error);
    }
  }

  // Fallback when service role is not configured (e.g. local dev without key).
  throw new Error("Admin client required to persist active auth session");
}

/**
 * After a successful sign-in, revoke other device sessions and register this one as active.
 */
export async function establishSingleUserSession(
  supabase: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { ok: false, error: sessionError?.message ?? "No session" };
  }

  const sessionId = getSessionIdFromAccessToken(session.access_token);
  if (!sessionId) {
    return { ok: false, error: "Missing session_id in access token" };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) {
    console.warn("[auth] signOut(others) failed:", signOutError.message);
  }

  try {
    await persistActiveSessionId(session.user.id, sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_auth_session_id: sessionId })
      .eq("id", session.user.id);
    if (updateError) {
      console.warn("[auth] Failed to persist active session:", updateError.message, message);
      return { ok: false, error: updateError.message };
    }
  }

  return { ok: true };
}

export async function enforceActiveSessionOrSignOut(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string
): Promise<ActiveSessionStatus> {
  const status = await validateActiveSession(supabase, userId, accessToken);
  if (status === "stale") {
    await supabase.auth.signOut();
  }
  return status;
}
