/**
 * Centralized AI model pricing (per-token USD).
 * Update this file when provider prices change. Do not fetch pricing from the internet at runtime.
 */

export type PricingEntry = {
  /** Input tokens: USD per 1K tokens */
  inputPer1k: number;
  /** Output tokens: USD per 1K tokens */
  outputPer1k: number;
  /** Optional: cached/prompt cache tokens, USD per 1K (if applicable) */
  cachedPer1k?: number;
};

export type ProviderModelKey = `${string}/${string}`;

/** Provider/model → pricing. Add new models here. */
const PRICING: Record<string, PricingEntry> = {
  "openai/gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
  "openai/gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  "openai/gpt-4-turbo": { inputPer1k: 0.01, outputPer1k: 0.03 },
  "openai/gpt-3.5-turbo": { inputPer1k: 0.0005, outputPer1k: 0.0015 },
  "anthropic/claude-3-5-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015 },
  "anthropic/claude-3-5-haiku": { inputPer1k: 0.0008, outputPer1k: 0.004 },
  "anthropic/claude-3-haiku": { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  "anthropic/claude-3-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015 },
};

const DEFAULT_LIGHT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_FULL_MODEL = "openai/gpt-4o";

/**
 * Get pricing for a provider/model key. Returns undefined if unknown (caller should use fallback or block).
 */
export function getModelPricing(provider: string, model: string): PricingEntry | undefined {
  const key = `${provider}/${model}`.toLowerCase();
  if (PRICING[key]) return PRICING[key];
  // Try provider-only match for model variants (e.g. gpt-4o-2024-08-06 → gpt-4o)
  const baseModel = model.split("-").slice(0, 3).join("-");
  return PRICING[`${provider}/${baseModel}`.toLowerCase()];
}

/**
 * Estimate cost in USD for a request.
 */
export function estimateRequestCostUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens?: number
): number {
  const p = getModelPricing(provider, model);
  if (!p) return 0;
  const inputCost = (inputTokens / 1000) * p.inputPer1k;
  const outputCost = (outputTokens / 1000) * p.outputPer1k;
  const cachedCost =
    cachedTokens != null && p.cachedPer1k != null ? (cachedTokens / 1000) * p.cachedPer1k : 0;
  return Math.max(0, inputCost + outputCost + cachedCost);
}

export function getDefaultLightModel(): string {
  return DEFAULT_LIGHT_MODEL;
}

export function getDefaultFullModel(): string {
  return DEFAULT_FULL_MODEL;
}
