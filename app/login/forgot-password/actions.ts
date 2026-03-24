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

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

const GENERIC_RESET_RESPONSE = "If an account exists, we sent an email.";

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);

  const limit = consumeRateLimitSafe({
    key: buildRateLimitKey("password-reset", ip),
    limit: RATE_LIMITS.passwordReset.limit,
    windowMs: RATE_LIMITS.passwordReset.windowMs,
  });
  if (!limit.allowed) {
    console.warn(`[security] Rate limit hit for password reset. ip=${ip}`);
    return { error: RATE_LIMIT_TOO_MANY };
  }

  if (!email || !email.includes("@")) {
    return { success: GENERIC_RESET_RESPONSE };
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/login`,
    });
  } catch (error) {
    console.warn(
      "[security] Password reset send failed (user still sees generic message):",
      error instanceof Error ? error.message : error
    );
  }

  return { success: GENERIC_RESET_RESPONSE };
}
