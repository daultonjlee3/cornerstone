import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { can } from "@/src/lib/permissions";
import { getAuthContext } from "@/src/lib/auth-context";
import { isFleetProductProfile } from "@/app/(authenticated)/nav-config";

export async function requireImplementationAccess() {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  if (!auth.tenantId) {
    redirect("/onboarding");
  }

  if (!isFleetProductProfile(auth.productProfile)) {
    redirect("/operations");
  }

  const allowed = (await can("integrations.manage")) || (await can("fleet.view"));
  if (!allowed) {
    redirect("/operations");
  }

  return { supabase, auth };
}
