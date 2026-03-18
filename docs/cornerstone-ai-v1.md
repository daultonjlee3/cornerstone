# Cornerstone AI v1

Cornerstone AI v1 is the first productized AI layer for Cornerstone OS. It is **read-only**, **grounded** in app data and help content, and **quota-controlled**.

## Capabilities

1. **Help Copilot** – Answers workflow and product questions using in-app documentation (tour steps, `docs/modules/*.md`).
2. **Read-Only Ops Assistant** – Answers operational questions using tenant-scoped data (work orders, PM due, technician workload, list summaries).
3. **Record and List Summaries** – Summarizes a single work order, asset, or a list/queue.

## Architecture

- **Server-only** – All LLM calls and retrieval run on the server. No model calls from the UI.
- **Intent classification** – Lightweight heuristics in `src/lib/cornerstone-ai/intent.ts` (HELP, OPS_QUERY, RECORD_SUMMARY, LIST_SUMMARY, UNKNOWN). No LLM classifier in v1.
- **Retrieval** – Structured tools in `src/lib/cornerstone-ai/retrieval.ts` and `help.ts`. Data is tenant-scoped via `companyIds` from auth.
- **Pipeline** – `execute.ts`: classify → retrieve context → build prompt → check quota → call LLM → record usage → format response.
- **Quota** – Every request goes through `checkAiQuotaBeforeRequest` and `recordAiUsage` in `src/lib/ai/metering.ts`. FULL vs LIGHT mode is decided by quota (soft limit → LIGHT).

## Key paths

| Purpose | Path |
|--------|------|
| Types, intent, context | `src/lib/cornerstone-ai/types.ts`, `intent.ts` |
| Help content | `src/lib/cornerstone-ai/help.ts` (tours + `docs/modules/`) |
| Ops/summary retrieval | `src/lib/cornerstone-ai/retrieval.ts` |
| Prompts | `src/lib/cornerstone-ai/prompts.ts` |
| LLM client | `src/lib/cornerstone-ai/llm.ts` (OpenAI; `OPENAI_API_KEY`) |
| Format response | `src/lib/cornerstone-ai/format.ts` |
| Execute pipeline | `src/lib/cornerstone-ai/execute.ts` |
| Quota / metering | `src/lib/ai/metering.ts`, `pricing.ts`, `credits.ts` |
| Server action | `app/(authenticated)/ai/actions.ts` |
| Global UI | `app/(authenticated)/components/cornerstone-ai-panel.tsx`, TopBar |

## Adding tools

1. **New retrieval function** – In `retrieval.ts`, add a function that takes `(supabase, companyIds, ...)` and returns structured data (no raw DB rows to the model).
2. **Wire into execute** – In `execute.ts`, for the relevant intent (e.g. OPS_QUERY), call the new function and merge into the context passed to `buildAiPrompt`.
3. **Prompt** – In `prompts.ts`, extend the OPS (or other) system/user prompt to describe the new data shape so the model can summarize it.

## Adding entities

- **New record type (e.g. property)** – Add `getPropertySummaryContext` in `retrieval.ts`, add RECORD_SUMMARY handling in `execute.ts` for `context.entityType === "property"`, and extend `buildAiPrompt` for that context. Add UI entry point (e.g. “Summarize” on property detail page) that opens the panel with `context: { entityType: "property", entityId }`.
- **New list type** – Add list summary retrieval for the entity in `retrieval.ts`, handle in `getListSummaryContext` or a dedicated function, and pass `entityType: "list"` with `listFilters: { entityType: "assets" }` (or the new key) from the list page.

## Model routing and quota

- **Model** – LIGHT = `getDefaultLightModel()` (e.g. gpt-4o-mini), FULL = `getDefaultFullModel()` (e.g. gpt-4o). Defined in `src/lib/ai/pricing.ts`.
- **Quota** – `checkAiQuotaBeforeRequest(tenantId, supabase, { requestedMode, inputTokens, outputTokens, ... })` returns allowed/mode (FULL/LIGHT/BLOCKED). Over soft limit → LIGHT; over hard limit → BLOCKED (or per-tenant policy). After the call, `recordAiUsage(supabase, { tenantId, userId, featureKey: "cornerstone_ai", ... })`.

## Out of scope for v1

- Creating, updating, assigning, closing, or rescheduling work orders or other records.
- Autonomous agents or background jobs.
- Cross-tenant data or bypassing permission checks.
- Vector DB or heavy RAG; help is keyword search + tour/docs only.
- Write actions; v2 can add approved actions behind confirmations.

## Tests

- `npx vitest run tests/cornerstone-ai.test.ts` – Intent, format, help retrieval.
- `npx vitest run tests/ai-metering` – Quota and pricing.

## Env

- `OPENAI_API_KEY` – Required for Cornerstone AI. If missing, the pipeline throws a clear error.
