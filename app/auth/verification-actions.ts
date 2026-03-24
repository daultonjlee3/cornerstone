"use server";

import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { SITE_URL } from "@/lib/marketing-site";
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
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);

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
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${SITE_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      // Log for ops; same user-facing message to reduce enumeration signals.
      console.warn("[auth] resend verification returned error:", error.message);
      return { success: RESEND_VERIFICATION_GENERIC_SUCCESS };
    }
    console.info("[auth] Resend verification email requested.", { emailDomain: email.split("@")[1] ?? "unknown" });
  } catch (err) {
    console.warn("[auth] resend verification exception:", err instanceof Error ? err.message : err);
    return { error: RESEND_VERIFICATION_GENERIC_FAILURE };
  }

  return { success: RESEND_VERIFICATION_GENERIC_SUCCESS };
}
