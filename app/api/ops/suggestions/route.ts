import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { generateSuggestions } from "@/src/lib/ops-suggestions/engine";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (e) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 },
    );
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return NextResponse.json(
      { suggestions: [] as unknown[] },
      { status: 200 },
    );
  }

  const suggestions = await generateSuggestions({
    supabase,
    companyIds: auth.companyIds,
  });

  return NextResponse.json({ suggestions });
}

