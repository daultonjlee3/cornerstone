import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyWebhookSecret(secret: string, storedHash: string | null | undefined): boolean {
  if (!secret || !storedHash) return false;
  const computed = hashWebhookSecret(secret);
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}
