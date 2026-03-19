import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { getOnboardingProgress } from "@/src/lib/onboarding/get-started-progress";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }
  const progress = await getOnboardingProgress(supabase, tenantId);
  return NextResponse.json(progress);
}
