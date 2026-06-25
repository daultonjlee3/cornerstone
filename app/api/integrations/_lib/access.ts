import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";

type AccessLevel = "read" | "manage";

export async function getIntegrationApiContext(level: AccessLevel): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      auth: Awaited<ReturnType<typeof getAuthContext>>;
      response?: undefined;
    }
  | {
      response: NextResponse;
      supabase?: undefined;
      auth?: undefined;
    }
> {
  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!auth.tenantId) {
    return { response: NextResponse.json({ error: "No tenant" }, { status: 400 }) };
  }

  if (level === "manage") {
    if (!(await can("integrations.manage"))) {
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { supabase, auth };
  }

  const allowed = (await can("integrations.manage")) || (await can("fleet.view"));
  if (!allowed) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, auth };
}
