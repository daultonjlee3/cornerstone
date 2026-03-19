import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { generateOptimizationProposals } from "@/src/lib/ops-optimization/engine";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ proposals: [] as unknown[] }, { status: 401 });
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return NextResponse.json({ proposals: [] as unknown[] }, { status: 200 });
  }

  const proposals = await generateOptimizationProposals({
    supabase,
    companyIds: auth.companyIds,
  });

  return NextResponse.json({ proposals });
}

