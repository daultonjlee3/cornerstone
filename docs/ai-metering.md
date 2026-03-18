# AI usage metering

Tenant-level AI usage limits, per-request logging, and quota enforcement so AI features can be enabled without runaway cost.

## Flow

1. **Before any AI request:** Call `checkAiQuotaBeforeRequest(tenantId, supabase, options)`.
2. **Decision:** Returns `AiQuotaDecision`: `allowed`, `mode` (FULL | LIGHT | BLOCKED), `remainingEstimatedBudgetUsd`, `uiMessage`, etc.
3. **Execute:** If `allowed`, run the AI request in the returned `mode` (use light model when `mode === "LIGHT"`). If not allowed, do not call the model; return a graceful error to the user.
4. **After the request:** Call `recordAiUsage(supabase, { tenantId, featureKey, provider, model, inputTokens, outputTokens, estimatedTotalCostUsd, creditsUsed, status, requestId? })`. Use `requestId` for idempotency (same request = one charge).

## Where to update pricing

Edit **`src/lib/ai/pricing.ts`**. The `PRICING` map is provider/model → `{ inputPer1k, outputPer1k, cachedPer1k? }` in USD. Add new models there; do not fetch pricing from the internet at runtime.

## Integrating a new AI feature

1. Resolve `tenantId` (e.g. from `getTenantIdForUser(supabase)`).
2. Optionally estimate cost: `estimateAiRequestCost(provider, model, inputTokens, outputTokens)`.
3. Call `checkAiQuotaBeforeRequest(tenantId, supabase, { featureKey, requestedMode, estimatedCostUsd, ... })`.
4. If `!decision.allowed`, return a typed error / UI message (e.g. `decision.uiMessage`).
5. If allowed, run the LLM in `decision.mode` (FULL or LIGHT). For LIGHT, use a cheaper model (see `getDefaultLightModel()` in pricing).
6. After the call, `recordAiUsage(supabase, { tenantId, userId, featureKey, requestId, provider, model, mode, inputTokens, outputTokens, estimatedTotalCostUsd, creditsUsed: costUsdToCredits(estimatedTotalCostUsd), status: "SUCCESS" })`.

## Defaults

- **No tenant_ai_config row:** Safe defaults apply (aiEnabled: true, $20 included, $30 soft, $40 hard, 80% warning, DEGRADE_TO_LIGHT).
- **Over soft limit:** Policy can allow full, degrade to light, or block.
- **Over hard limit:** Block (or allow light-only if policy is DEGRADE and request is already light).

## Credits

Cost (USD) is source of truth. Credits are derived in **`src/lib/ai/credits.ts`** via `costUsdToCredits(usd)`. Use for UI (“X credits remaining”); do not use credits for enforcement.
