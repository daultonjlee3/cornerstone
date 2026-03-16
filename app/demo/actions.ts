"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { DEMO_LOGIN_CONFIG, SITE_URL } from "@/lib/marketing-site";
import crypto from "crypto";

export type EnterDemoState = { error?: string; redirectUrl?: string };

const DEMO_SLUGS = [
  "facility-maintenance",
  "industrial",
  "school-district",
  "healthcare",
] as const;

function randomPassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Create a temporary demo guest session: auth user + tenant_membership (demo_guest) + lead row,
 * then return a magic link URL so the client can redirect without showing login.
 * Caller must only use redirectUrl over HTTPS in production.
 */
export async function enterDemoAction(
  _prev: EnterDemoState,
  formData: FormData
): Promise<EnterDemoState> {
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

  // Ensure demo guest has only this tenant: remove any other demo_guest memberships so refresh
  // always resolves to the selected environment (layout uses limit(1) with no order).
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

  const envUrl =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SITE_URL?.trim() : undefined;

  const baseUrl =
    envUrl ||
    SITE_URL ||
    // Localhost is only used as a last resort in non-production environments.
    (process.env.NODE_ENV === "production" ? "https://cornerstonecmms.com" : "http://localhost:3000");
  const redirectTo = `${baseUrl.replace(/\/$/, "")}/auth/callback?next=/dashboard`;

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

  return { redirectUrl: linkData.properties.action_link };
}
