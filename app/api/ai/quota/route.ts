/**
 * POST /api/ai/quota — Check quota before an AI request.
 * Body: { featureKey?, requestedMode?, provider?, model?, inputTokens?, outputTokens? }
 * Returns: AiQuotaDecision (allowed, mode, remainingBudgetUsd, uiMessage, etc.)
 * Use this from server actions or other API routes before calling an LLM.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { checkAiQuotaBeforeRequest } from "@/src/lib/ai/metering";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  let body: {
    featureKey?: string;
    requestedMode?: "FULL" | "LIGHT";
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const decision = await checkAiQuotaBeforeRequest(tenantId, supabase, {
    featureKey: body.featureKey ?? "api",
    requestedMode: body.requestedMode,
    provider: body.provider,
    model: body.model,
    inputTokens: body.inputTokens,
    outputTokens: body.outputTokens,
  });

  return NextResponse.json(decision);
}
