"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { DEMO_LOGIN_CONFIG, SITE_URL } from "@/lib/marketing-site";
import {
  buildRateLimitKey,
  consumeRateLimitSafe,
  RATE_LIMITS,
  RATE_LIMIT_TOO_MANY,
} from "@/lib/security/rateLimit";
import { getRequestIp } from "@/lib/security/getRequestIp";
import { TURNSTILE_VERIFY_FAILED, verifyTurnstileToken } from "@/lib/security/verifyTurnstile";
import crypto from "crypto";

export type EnterDemoState = { error?: string; success?: boolean };

const DEMO_SLUGS = [
  "facility-maintenance",
  "industrial",
  "school-district",
  "healthcare",
] as const;

function randomPassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function demoSessionId(): string {
  return crypto.randomBytes(12).toString("hex");
}

/**
 * Create a temporary demo guest session: auth user + tenant_membership (demo_guest) + lead row,
 * then redirect to Supabase's one-time magic link URL so the browser navigates immediately.
 * (Client-side window.location after async server actions is unreliable on mobile Safari.)
 */
export async function enterDemoAction(
  _prev: EnterDemoState,
  formData: FormData
): Promise<EnterDemoState> {
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);
  const honey = ((formData.get("website") as string | null) ?? "").trim();
  const captchaToken = (formData.get("turnstile_token") as string | null)?.trim() || null;

  // Honeypot: silent success — no side effects, generic UX.
  if (honey) {
    console.warn(`[security] Honeypot triggered on demo form. ip=${ip}`);
    return { success: true };
  }

  const demoLimit = consumeRateLimitSafe({
    key: buildRateLimitKey("demo-enter", ip),
    limit: RATE_LIMITS.demo.limit,
    windowMs: RATE_LIMITS.demo.windowMs,
  });
  if (!demoLimit.allowed) {
    console.warn(`[security] Rate limit hit for demo entry. ip=${ip}`);
    return { error: RATE_LIMIT_TOO_MANY };
  }

  const turnstileOk = await verifyTurnstileToken({ token: captchaToken, remoteIp: ip });
  if (!turnstileOk) {
    console.warn(`[security] Turnstile verification failed for demo form. ip=${ip}`);
    return { error: TURNSTILE_VERIFY_FAILED };
  }

  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const companyName = (formData.get("company_name") as string)?.trim() || null;
  const industrySlug = (formData.get("industry_slug") as string)?.trim();

  if (!email) return { error: "Work email is required." };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { error: "Please enter a valid email address." };

  const config = industrySlug ? DEMO_LOGIN_CONFIG[industrySlug] : null;
  if (!config || !DEMO_SLUGS.includes(industrySlug as (typeof DEMO_SLUGS)[number])) {
    return { error: "Invalid industry. Please choose an industry and try again." };
  }

  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", config.tenantSlug)
    .maybeSingle();

  if (!tenant?.id) {
    return { error: "Demo environment is not available. Please try again later." };
  }

  const password = randomPassword();
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string;

  if (createError) {
    if (
      createError.message?.includes("already been registered") ||
      createError.message?.toLowerCase().includes("already exists")
    ) {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing?.id) {
        return { error: "This email is already registered. Sign in from the login page to continue." };
      }
      userId = existing.id;
      await supabase.from("tenant_memberships").upsert(
        { tenant_id: tenant.id, user_id: existing.id, role: "demo_guest" },
        { onConflict: "tenant_id,user_id" }
      );
    } else {
      return { error: createError.message || "Could not create demo session." };
    }
  } else if (createData?.user?.id) {
    userId = createData.user.id;
  } else {
    return { error: "Could not create demo session." };
  }

  const { error: memError } = await supabase.from("tenant_memberships").upsert(
    { tenant_id: tenant.id, user_id: userId, role: "demo_guest" },
    { onConflict: "tenant_id,user_id" }
  );
  if (memError) return { error: memError.message || "Could not link demo environment." };

  await supabase
    .from("tenant_memberships")
    .delete()
    .eq("user_id", userId)
    .eq("role", "demo_guest")
    .neq("tenant_id", tenant.id);

  await supabase.from("demo_leads").insert({
    email,
    company_name: companyName,
    industry_slug: industrySlug,
  });

  const rawEnvUrl =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SITE_URL?.trim() : undefined;

  const isProd = process.env.NODE_ENV === "production";
  const defaultProdUrl = "https://cornerstonecmms.com";
  const defaultDevUrl = "http://localhost:3000";

  const baseUrl = isProd
    ? rawEnvUrl && !rawEnvUrl.includes("localhost")
      ? rawEnvUrl
      : defaultProdUrl
    : rawEnvUrl || SITE_URL || defaultDevUrl;
  const sessionId = demoSessionId();
  const next = `/operations?demo=true&demo_session=${encodeURIComponent(sessionId)}&industry=${encodeURIComponent(industrySlug)}`;
  const redirectTo = `${baseUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return {
      error:
        "Demo session was created but we could not sign you in automatically. Please check your email for a sign-in link, or use the login page.",
    };
  }

  redirect(linkData.properties.action_link);
}
