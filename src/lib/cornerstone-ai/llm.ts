/**
 * Minimal server-side LLM client for Cornerstone AI.
 * Uses OpenAI API; model chosen by mode (LIGHT vs FULL) from pricing defaults.
 */

import { getDefaultLightModel, getDefaultFullModel } from "@/src/lib/ai/pricing";

export type LlmResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
};

/** Parse "openai/gpt-4o-mini" -> "gpt-4o-mini" for API. */
function modelKeyToApiModel(key: string): string {
  const slash = key.indexOf("/");
  return slash >= 0 ? key.slice(slash + 1) : key;
}

/**
 * Call OpenAI chat completion. Uses OPENAI_API_KEY.
 * mode: LIGHT -> gpt-4o-mini, FULL -> gpt-4o.
 */
export async function callCornerstoneLlm(
  system: string,
  user: string,
  mode: "FULL" | "LIGHT"
): Promise<LlmResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not set. Cornerstone AI cannot run.");
  }

  const modelKey = mode === "LIGHT" ? getDefaultLightModel() : getDefaultFullModel();
  const provider = modelKey.slice(0, modelKey.indexOf("/")) || "openai";
  const model = modelKeyToApiModel(modelKey);

  const body = {
    model,
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.text()) || res.statusText;
    throw new Error(`OpenAI API error (${res.status}): ${err.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage ?? {};
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;

  return {
    content,
    inputTokens,
    outputTokens,
    model: modelKey,
    provider,
  };
}
