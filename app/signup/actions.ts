"use server";

import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { sendInternalNotificationEmail } from "@/lib/email/sendInternalNotification";
import {
  buildRateLimitKey,
  consumeRateLimitSafe,
  RATE_LIMITS,
  RATE_LIMIT_TOO_MANY,
} from "@/lib/security/rateLimit";
import { getRequestIp } from "@/lib/security/getRequestIp";
import { TURNSTILE_VERIFY_FAILED, verifyTurnstileToken } from "@/lib/security/verifyTurnstile";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/marketing-site";

export type SignupState = {
  error?: string;
  success?: string;
  /** True when Supabase created the user but no session (email confirmation required). */
  verificationPending?: boolean;
  pendingEmail?: string;
};

/** Same copy whether user is real or honeypot — avoids tipping off bots. */
const VERIFY_EMAIL_COPY =
  "If your email is valid, check your inbox to verify your account. After verification, sign in to continue onboarding.";

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const organizationName = (formData.get("organization_name") as string | null)?.trim() || undefined;
  const source = (formData.get("source") as string | null)?.trim() === "demo" ? "demo" : "";
  const honey = ((formData.get("website") as string | null) ?? "").trim();
  const captchaToken = (formData.get("turnstile_token") as string | null)?.trim() || null;

  const headerStore = await headers();
  const ip = getRequestIp(headerStore);

  // Honeypot: silent success (no account creation, no enumeration signal).
  if (honey) {
    console.warn(`[security] Honeypot triggered on signup. ip=${ip}`);
    return { success: VERIFY_EMAIL_COPY };
  }

  const signupLimit = consumeRateLimitSafe({
    key: buildRateLimitKey("signup", ip),
    limit: RATE_LIMITS.signup.limit,
    windowMs: RATE_LIMITS.signup.windowMs,
  });
  if (!signupLimit.allowed) {
    console.warn(`[security] Rate limit hit for signup. ip=${ip}`);
    return { error: RATE_LIMIT_TOO_MANY };
  }

  const turnstileOk = await verifyTurnstileToken({ token: captchaToken, remoteIp: ip });
  if (!turnstileOk) {
    console.warn(`[security] Turnstile verification failed for signup. ip=${ip}`);
    return { error: TURNSTILE_VERIFY_FAILED };
  }

  if (!email?.trim() || !password) {
    return { error: "Email and password are required." };
  }

  const emailRedirectTo = `${SITE_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent("/onboarding")}`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { organization_name: organizationName },
        emailRedirectTo,
      },
    });
    if (error) {
      console.warn("[signup] Supabase signUp error (generic client message):", error.message);
      return { error: "Something went wrong. Please try again." };
    }

    // When email confirmation is enabled in Supabase, session is null until verify.
    if (!data.session) {
      return { verificationPending: true, pendingEmail: email.trim() };
    }

    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[security] Signup returned an immediate session. Enable email confirmation in Supabase (Auth → Providers → Email) for production so new users must verify before access."
      );
    }

    const isNewSignup = Boolean(data.user?.id && (data.user.identities?.length ?? 0) > 0);
    if (isNewSignup) {
      try {
        const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
        await sendInternalNotificationEmail({
          name:
            (metadata.full_name as string | undefined) ??
            (metadata.name as string | undefined) ??
            null,
          email: data.user?.email ?? email.trim(),
          companyName:
            organizationName ??
            (metadata.organization_name as string | undefined) ??
            null,
          phone: (metadata.phone as string | undefined) ?? null,
          technicianCount:
            (metadata.technician_count as string | number | undefined) ??
            (metadata.team_size as string | number | undefined) ??
            null,
          signupTimestamp: new Date().toISOString(),
        });
      } catch (notificationError) {
        console.warn(
          "[signup-notification] Internal email skipped/failed (signup still succeeds):",
          notificationError instanceof Error ? notificationError.message : notificationError
        );
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[signup] Exception (generic client message):", message);
    if (message === "fetch failed" || message.includes("fetch")) {
      return { error: "Something went wrong. Please try again." };
    }
    if (message.includes("Missing Supabase env")) {
      return { error: "Something went wrong. Please try again." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  const orgParam = organizationName ? `&org=${encodeURIComponent(organizationName)}` : "";
  redirect(`/onboarding?source=${source || "signup"}${orgParam}`);
}
