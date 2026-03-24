"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { resendVerificationEmailAction } from "@/app/auth/verification-actions";
import type { ResendVerificationState } from "@/app/auth/verification-types";

const INITIAL_RESEND: ResendVerificationState = {};

const COOLDOWN_SECONDS = 60;

type ResendVerificationSectionProps = {
  email: string;
  /** Post-verify redirect (must be a relative path). Defaults to onboarding after signup. */
  redirectNext?: string;
  /** Called after a successful resend so parent can start cooldown if needed */
  onResendSuccess?: () => void;
};

/**
 * Resend signup confirmation email with 60s client cooldown and server rate limits.
 */
export function ResendVerificationSection({
  email,
  redirectNext = "/onboarding",
  onResendSuccess,
}: ResendVerificationSectionProps) {
  const [authOrigin, setAuthOrigin] = useState("");
  const [state, formAction, isPending] = useActionState(resendVerificationEmailAction, INITIAL_RESEND);
  const [cooldown, setCooldown] = useState(0);
  const lastHandledSuccessRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setAuthOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (isPending) lastHandledSuccessRef.current = undefined;
  }, [isPending]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (!state?.success || state.success === lastHandledSuccessRef.current) return;
    lastHandledSuccessRef.current = state.success;
    setCooldown(COOLDOWN_SECONDS);
    onResendSuccess?.();
  }, [state?.success, onResendSuccess]);

  const disabled = isPending || cooldown > 0 || !email.trim().includes("@");
  let buttonLabel = "Resend verification email";
  if (isPending) buttonLabel = "Sending…";
  else if (cooldown > 0) buttonLabel = `Resend in ${cooldown}s`;

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input type="hidden" name="email" value={email} readOnly />
        <input type="hidden" name="next" value={redirectNext} readOnly />
        <input type="hidden" name="auth_origin" value={authOrigin} readOnly />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
        >
          {buttonLabel}
        </button>
      </form>
      {state?.error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {state.success}
        </p>
      ) : null}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Use the newest verification email if you requested more than one.
      </p>
    </div>
  );
}
