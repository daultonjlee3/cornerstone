import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import {
  exchangeSamsaraCode,
  mergeTokensIntoConfig,
  tokensFromOAuthResponse,
  verifyOAuthState,
} from "@/src/lib/integrations/connectors/samsara/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings/integrations`;

  if (!code || !stateParam) {
    return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=missing_code`);
  }

  const state = verifyOAuthState(stateParam);
  if (!state) {
    return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=invalid_state`);
  }

  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  if (auth.userId !== state.userId || auth.tenantId !== state.tenantId) {
    return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=session_mismatch`);
  }

  try {
    const tokenResponse = await exchangeSamsaraCode(code);
    const tokens = tokensFromOAuthResponse(tokenResponse);

    const connectionId = state.connectionId;
    if (!connectionId) {
      return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=no_connection`);
    }

    const { data: existing } = await supabase
      .from("integration_connections")
      .select("config")
      .eq("id", connectionId)
      .eq("tenant_id", state.tenantId)
      .maybeSingle();

    const prevConfig = ((existing as { config?: Record<string, unknown> } | null)?.config ??
      {}) as Record<string, unknown>;

    const { error } = await supabase
      .from("integration_connections")
      .update({
        status: "active",
        config: mergeTokensIntoConfig(prevConfig, tokens),
        last_error: null,
      })
      .eq("id", connectionId)
      .eq("tenant_id", state.tenantId);

    if (error) {
      return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=save_failed`);
    }

    return NextResponse.redirect(`${settingsUrl}?samsara=connected`);
  } catch {
    return NextResponse.redirect(`${settingsUrl}?samsara=error&reason=token_exchange`);
  }
}
