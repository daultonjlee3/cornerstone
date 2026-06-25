import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { isFleetProductProfile } from "@/app/(authenticated)/nav-config";

export async function requireFleetModuleAccess() {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth.tenantId) {
    redirect("/onboarding");
  }
  if (!isFleetProductProfile(auth.productProfile)) {
    redirect("/operations");
  }
  if (!(await can("fleet.view"))) {
    redirect("/operations");
  }
  return { supabase, auth };
}
