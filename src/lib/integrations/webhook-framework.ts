import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookVerificationResult = {
  ok: boolean;
  reason?: string;
};

export function verifyWebhookSignature(input: {
  strategy: "none" | "shared_secret" | "hmac_sha256";
  providedSignature?: string | null;
  sharedSecret?: string | null;
  payload?: string;
}): WebhookVerificationResult {
  if (input.strategy === "none") return { ok: true };

  const provided = (input.providedSignature ?? "").trim();
  const secret = (input.sharedSecret ?? "").trim();
  if (!provided || !secret) {
    return { ok: false, reason: "Missing signature or secret" };
  }

  if (input.strategy === "shared_secret") {
    const valid = safeCompare(provided, secret);
    return valid ? { ok: true } : { ok: false, reason: "Signature mismatch" };
  }

  const payload = input.payload ?? "";
  const computed = createHmac("sha256", secret).update(payload).digest("hex");
  return safeCompare(provided, computed)
    ? { ok: true }
    : { ok: false, reason: "HMAC signature mismatch" };
}

export async function logWebhookEvent(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    provider: string;
    payloadSummary: Record<string, unknown>;
    eventKey?: string | null;
    eventHash?: string | null;
    status?: "received" | "processed" | "partial" | "failed" | "duplicate";
    syncRunId?: string | null;
    errorMessage?: string | null;
  }
): Promise<{ id: string; duplicate: boolean }> {
  if (input.eventKey) {
    const { data: existing } = await supabase
      .from("integration_webhook_events")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("connection_id", input.connectionId)
      .eq("event_key", input.eventKey)
      .maybeSingle();
    if (existing?.id) {
      await supabase
        .from("integration_webhook_events")
        .update({
          status: "duplicate",
          processed_at: new Date().toISOString(),
          payload_summary: input.payloadSummary,
        })
        .eq("id", existing.id)
        .eq("tenant_id", input.tenantId);
      return { id: String(existing.id), duplicate: true };
    }
  }

  const { data, error } = await supabase
    .from("integration_webhook_events")
    .insert({
      tenant_id: input.tenantId,
      connection_id: input.connectionId,
      provider: input.provider,
      event_key: input.eventKey ?? null,
      event_hash: input.eventHash ?? null,
      payload_summary: input.payloadSummary,
      status: input.status ?? "received",
      sync_run_id: input.syncRunId ?? null,
      error_message: input.errorMessage ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: String(data.id), duplicate: false };
}

export async function recordWebhookDeliveryAttempt(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    webhookEventId: string;
    attemptNo: number;
    status: "processing" | "success" | "failed";
    syncRunId?: string | null;
    durationMs?: number | null;
    errorMessage?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("integration_webhook_delivery_attempts").insert({
    tenant_id: input.tenantId,
    webhook_event_id: input.webhookEventId,
    attempt_no: input.attemptNo,
    status: input.status,
    sync_run_id: input.syncRunId ?? null,
    duration_ms: input.durationMs ?? null,
    error_message: input.errorMessage ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function completeWebhookEvent(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    webhookEventId: string;
    status: "processed" | "partial" | "failed" | "duplicate";
    syncRunId?: string | null;
    errorMessage?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("integration_webhook_events")
    .update({
      status: input.status,
      sync_run_id: input.syncRunId ?? null,
      error_message: input.errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.webhookEventId);
  if (error) throw new Error(error.message);
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
