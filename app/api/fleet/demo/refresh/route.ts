import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { canManagePeachtreeDemoReset } from "@/src/lib/fleet/demo/peachtree-demo-auth";
import {
  isPeachtreeDemoRefreshConfigured,
  refreshPeachtreeDemoTenant,
} from "@/src/lib/fleet/demo/peachtree-demo-refresh";
import { AdminClientConfigError } from "@/src/lib/supabase/admin";

export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant context." }, { status: 403 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", auth.tenantId)
    .maybeSingle();

  const slug = (tenant as { slug: string | null } | null)?.slug ?? null;
  if (!canManagePeachtreeDemoReset(auth, slug)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isPeachtreeDemoRefreshConfigured()) {
    return NextResponse.json(
      {
        error:
          "Demo reset is not configured on this environment (missing SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 }
    );
  }

  try {
    const result = await refreshPeachtreeDemoTenant();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof AdminClientConfigError
        ? "Demo reset is not configured on this environment."
        : error instanceof Error
          ? error.message
          : "Demo reset failed.";
    console.error("[peachtree-demo-refresh]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
