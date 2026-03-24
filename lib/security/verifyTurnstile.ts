/**
 * Cloudflare Turnstile server-side verification.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export const TURNSTILE_VERIFY_FAILED = "Verification failed. Please try again.";

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

/**
 * Verifies the Turnstile token. When TURNSTILE_SECRET_KEY is unset (local dev),
 * verification is skipped so engineers can work without keys.
 *
 * - Invalid/missing token when secret is set → false (reject).
 * - Cloudflare returns success: false → false (reject).
 * - Network / HTTP errors on siteverify → true (fail-open) so temporary outages
 *   do not block legitimate signups; logged for ops.
 */
export async function verifyTurnstileToken({
  token,
  remoteIp,
}: {
  token: string | null | undefined;
  remoteIp?: string;
}): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[security] TURNSTILE_SECRET_KEY not set; Turnstile verification skipped (configure for production)."
      );
    }
    return true;
  }

  const trimmed = typeof token === "string" ? token.trim() : "";
  if (!trimmed) {
    console.warn("[security] Turnstile verification failed: missing token.");
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: trimmed,
    });
    if (remoteIp && remoteIp !== "unknown") {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[security] Turnstile siteverify HTTP ${response.status}; allowing request (fail-open).`
      );
      return true;
    }

    const data = (await response.json()) as SiteverifyResponse;
    if (!data.success) {
      console.warn(
        "[security] Turnstile verification failed:",
        (data["error-codes"] ?? []).join(", ") || "success=false"
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      "[security] Turnstile siteverify error; allowing request (fail-open):",
      error instanceof Error ? error.message : error
    );
    return true;
  }
}
