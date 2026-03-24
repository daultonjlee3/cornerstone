"use server";

import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import {
  buildRateLimitKey,
  consumeRateLimitSafe,
  RATE_LIMITS,
  RATE_LIMIT_TOO_MANY,
} from "@/lib/security/rateLimit";
import { getRequestIp } from "@/lib/security/getRequestIp";
import { redirect } from "next/navigation";

export type LoginState = { error?: string; needsVerification?: boolean };

function isUnverifiedEmailAuthError(error: { message?: string; code?: string }): boolean {
  const code = (error as { code?: string }).code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("user not confirmed") ||
    msg.includes("confirm your email")
  );
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);

  const loginKey = buildRateLimitKey("login", ip);
  const loginLimit = consumeRateLimitSafe({
    key: loginKey,
    limit: RATE_LIMITS.login.limit,
    windowMs: RATE_LIMITS.login.windowMs,
  });
  if (!loginLimit.allowed) {
    console.warn(
      `[security] Rate limit hit for login. ip=${ip} retry_after=${loginLimit.retryAfterSeconds}s`
    );
    return { error: RATE_LIMIT_TOO_MANY };
  }

  if (!email?.trim() || !password) {
    return { error: "Invalid email or password" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      if (isUnverifiedEmailAuthError(error)) {
        console.warn("[auth] Login blocked: email not verified (client gets verification prompt).", {
          code: (error as { code?: string }).code,
        });
        return { needsVerification: true };
      }
      console.warn("[security] Login failed (generic response to client).");
      return { error: "Invalid email or password" };
    }
    if (!data.session) {
      return { error: "Invalid email or password" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[security] Login exception (generic response):", message);
    return { error: "Invalid email or password" };
  }

  const next = formData.get("next") as string | null;
  redirect(next && next.startsWith("/") ? next : "/operations");
}
