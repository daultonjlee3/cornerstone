"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

const COOLDOWN_SECONDS = 60;

/** Generic copy when resend succeeds (does not confirm whether the address exists). */
const RESEND_SUCCESS_GENERIC =
  "If an account exists for this email, a new verification link has been sent.";

type ResendVerificationSectionProps = {
  email: string;
  /** Post-verify path appended as `?next=` (must be a relative path). */
  redirectNext?: string;
  onResendSuccess?: () => void;
};

/**
 * Client-side resend using the browser Supabase SDK (visible as `/auth/v1/resend` in Network).
 * Uses `type="button"` + onClick so this works when nested inside another `<form>` (e.g. login page),
 * where an inner `<form>` is invalid HTML and submit may not fire.
 */
export function ResendVerificationSection({
  email,
  redirectNext = "/onboarding",
  onResendSuccess,
}: ResendVerificationSectionProps) {
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    console.log("[auth] Resend clicked:", email);

    setSuccessMessage(null);
    setErrorMessage(null);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      console.error("[auth] Resend verification: missing or invalid email", { email });
      setErrorMessage("Email is missing. Go back and use the email you signed up with.");
      return;
    }

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      redirectNext.startsWith("/") ? redirectNext : `/${redirectNext}`
    )}`;
    console.log("[auth] Resend emailRedirectTo:", emailRedirectTo);

    setIsSending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo,
        },
      });

      console.log("[auth] Resend response:", data);
      if (error) {
        console.error("[auth] Resend error:", error);
        setErrorMessage(error.message || "Unable to send verification email. Please try again.");
        return;
      }

      console.log("[auth] Resend completed without error");
      setSuccessMessage(RESEND_SUCCESS_GENERIC);
      setCooldown(COOLDOWN_SECONDS);
      onResendSuccess?.();
    } catch (err) {
      console.error("[auth] Resend exception:", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [email, normalizedEmail, redirectNext, onResendSuccess]);

  const disabled = isSending || cooldown > 0 || !normalizedEmail.includes("@");
  let buttonLabel = "Resend verification email";
  if (isSending) buttonLabel = "Sending…";
  else if (cooldown > 0) buttonLabel = `Resend in ${cooldown}s`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={disabled}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
        >
          {buttonLabel}
        </button>
      </div>
      {errorMessage ? (
        <div className="space-y-1" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {successMessage}
        </p>
      ) : null}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Use the newest verification email if you requested more than one.
      </p>
    </div>
  );
}
