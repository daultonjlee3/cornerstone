import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { establishSingleUserSession } from "@/src/lib/auth/single-session";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const result = await establishSingleUserSession(supabase);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "establish_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
