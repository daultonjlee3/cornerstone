import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "../components/onboarding-form";
import { onboardingAction } from "./actions";

export const metadata = {
  title: "Set up your organization | Cornerstone Tech",
  description: "Create your tenant and first company",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Set up your organization
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create your workspace and first company to get started.
          </p>
        </div>
        <OnboardingForm action={onboardingAction} />
      </div>
    </div>
  );
}
