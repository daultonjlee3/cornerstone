"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingState = { error?: string };

/**
 * Create tenant → company → membership in sequence.
 *
 * Supabase does not auto-rollback on partial failures, so we manually clean up
 * any successfully created records if a later step fails. This prevents orphaned
 * tenants with no company or membership from cluttering the DB.
 */
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

  // Step 1: Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: tenantName })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    return { error: tenantError?.message || "Failed to create organization." };
  }

  const tenantId = tenant.id as string;

  // Step 2: Create company — roll back tenant if this fails
  const { error: companyError } = await supabase.from("companies").insert({
    tenant_id: tenantId,
    name: companyName,
  });

  if (companyError) {
    // Clean up the orphaned tenant record (fire-and-forget)
    void supabase.from("tenants").delete().eq("id", tenantId);
    return { error: companyError.message || "Failed to create company." };
  }

  // Step 3: Create membership — roll back tenant (cascades to company) if this fails
  const { error: membershipError } = await supabase.from("tenant_memberships").insert({
    tenant_id: tenantId,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    // Clean up both tenant and company (company FK cascades on most schemas,
    // but explicit delete is safer if cascade isn't set)
    void supabase.from("companies").delete().eq("tenant_id", tenantId);
    void supabase.from("tenants").delete().eq("id", tenantId);
    return { error: membershipError.message || "Failed to add you to the organization." };
  }

  redirect("/onboarding-wizard");
}
