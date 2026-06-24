import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { getOrCreateSamsaraConnection } from "@/src/lib/integrations/connections";
import { buildSamsaraAuthorizeUrl, signOAuthState } from "@/src/lib/integrations/connectors/samsara/oauth";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  if (!(await can("integrations.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await getOrCreateSamsaraConnection(supabase, auth.tenantId, auth.userId);

  const state = signOAuthState({
    tenantId: auth.tenantId,
    userId: auth.userId,
    connectionId: connection.id,
    ts: Date.now(),
  });

  const authorizeUrl = buildSamsaraAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}
