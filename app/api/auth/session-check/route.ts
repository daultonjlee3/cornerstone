import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  SESSION_REPLACED_LOGIN_REASON,
  validateActiveSession,
} from "@/src/lib/auth/single-session";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ valid: false, reason: "unauthenticated" });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ valid: false, reason: "no_session" });
  }

  const status = await validateActiveSession(supabase, user.id, session.access_token);
  if (status === "stale") {
    await supabase.auth.signOut();
    return NextResponse.json({ valid: false, reason: SESSION_REPLACED_LOGIN_REASON });
  }

  return NextResponse.json({ valid: true });
}
