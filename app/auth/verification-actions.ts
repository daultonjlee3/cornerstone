"use server";

import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { buildEmailRedirectTo, resolveAuthRedirectOrigin } from "@/lib/auth/auth-redirect-origin";
import {
  buildRateLimitKey,
  consumeRateLimitSafe,
  RATE_LIMITS,
  RATE_LIMIT_TOO_MANY,
} from "@/lib/security/rateLimit";
import { getRequestIp } from "@/lib/security/getRequestIp";
import type { ResendVerificationState } from "@/app/auth/verification-types";

/** Generic copy — avoids account enumeration whether or not the email exists. */
const RESEND_VERIFICATION_GENERIC_SUCCESS =
  "If an account exists for this email, a new verification link has been sent.";

const RESEND_VERIFICATION_GENERIC_FAILURE =
  "Something went wrong. Please try again in a moment.";

function sanitizeAuthNextPath(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s.startsWith("/") || s.startsWith("//")) return "/onboarding";
  return s;
}

/**
 * Resend Supabase signup confirmation email.
 * Configure Auth → Email templates and Site URL / redirect URLs in Supabase.
 */
export async function resendVerificationEmailAction(
  _prev: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const nextPath = sanitizeAuthNextPath(formData.get("next") as string | null);
  const authOriginField = (formData.get("auth_origin") as string | null)?.trim() || null;
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);
  const redirectOrigin = resolveAuthRedirectOrigin(headerStore, authOriginField);
  const emailRedirectTo = buildEmailRedirectTo(redirectOrigin, nextPath);

  const limit = consumeRateLimitSafe({
    key: buildRateLimitKey("resend-verification", ip),
    limit: RATE_LIMITS.resendVerification.limit,
    windowMs: RATE_LIMITS.resendVerification.windowMs,
  });
  if (!limit.allowed) {
    console.warn(`[auth] Rate limit hit for resend verification. ip=${ip}`);
    return { error: RATE_LIMIT_TOO_MANY };
  }

  if (!email || !email.includes("@")) {
    return { success: RESEND_VERIFICATION_GENERIC_SUCCESS };
  }

  try {
    console.info("[auth] resend verification request", {
      emailDomain: email.split("@")[1] ?? "unknown",
      redirectOrigin,
      emailRedirectTo,
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      console.warn("[auth] resend verification error (full)", {
        message: error.message,
        code: error.code,
        name: error.name,
        status: (error as { status?: number }).status,
      });
      // Same user-facing message to reduce enumeration signals.
      return { success: RESEND_VERIFICATION_GENERIC_SUCCESS };
    }

    console.info("[auth] resend verification OK", {
      emailDomain: email.split("@")[1] ?? "unknown",
    });
  } catch (err) {
    console.warn("[auth] resend verification exception:", err instanceof Error ? err.message : err);
    return { error: RESEND_VERIFICATION_GENERIC_FAILURE };
  }

  return { success: RESEND_VERIFICATION_GENERIC_SUCCESS };
}
