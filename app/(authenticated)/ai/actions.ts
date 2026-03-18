"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { executeCornerstoneAiRequest } from "@/src/lib/cornerstone-ai/execute";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "@/src/lib/cornerstone-ai/types";

export type SubmitCornerstoneAiQueryResult =
  | { ok: true; data: CornerstoneAiResponse }
  | { ok: false; error: string };

export async function submitCornerstoneAiQuery(
  query: string,
  context?: CornerstoneAiContext
): Promise<SubmitCornerstoneAiQueryResult> {
  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (err) {
    console.error("[Cornerstone AI] Failed to resolve auth context", err);
    return { ok: false, error: "You must be signed in to use Cornerstone AI." };
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return { ok: false, error: "No organization context. Complete onboarding first." };
  }

  try {
    const data = await executeCornerstoneAiRequest({
      supabase,
      tenantId: auth.tenantId,
      userId: auth.effectiveUserId,
      companyIds: auth.companyIds,
      query,
      context,
      isPlatformSuperAdmin: auth.isPlatformSuperAdmin,
    });
    return { ok: true, data };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[Cornerstone AI] Execution error", {
      message: err.message,
      stack: err.stack,
    });

    let message = err.message || "Something went wrong.";
    if (message.includes("OPENAI_API_KEY")) {
      message = "AI service not configured (OpenAI API key is missing).";
    } else if (message.toLowerCase().includes("monthly ai hard limit reached") ||
               message.toLowerCase().includes("ai is disabled for this organization")) {
      // Internal tenant quota block
      message = "Request blocked by AI usage limits for this organization.";
    } else if (message.toLowerCase().includes("you exceeded your current quota")) {
      // Upstream provider quota, not tenant-level
      message = "AI provider quota exceeded (OpenAI). Check provider billing/limits.";
    }

    return { ok: false, error: message };
  }
}
