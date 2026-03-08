"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingState = { error?: string };

export async function onboardingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const tenantName = (formData.get("tenant_name") as string | null)?.trim();
  const companyName = (formData.get("company_name") as string | null)?.trim();
  if (!tenantName || !companyName) {
    return { error: "Organization name and company name are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be signed in to complete onboarding." };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: tenantName })
    .select("id")
    .single();

  if (tenantError) {
    return { error: tenantError.message || "Failed to create organization." };
  }

  const { error: companyError } = await supabase.from("companies").insert({
    tenant_id: tenant.id,
    name: companyName,
  });

  if (companyError) {
    return { error: companyError.message || "Failed to create company." };
  }

  const { error: membershipError } = await supabase.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    return { error: membershipError.message || "Failed to add you to the organization." };
  }

  redirect("/dashboard");
}
