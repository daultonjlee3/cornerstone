"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Building2, Mail, Lock } from "lucide-react";
import { signupAction, type SignupState } from "./actions";
import { TurnstileField } from "@/app/components/security/turnstile-field";
import { VerificationPendingContent } from "@/app/auth/components/verification-pending-content";
import {
  fleetAuthInputClass,
  fleetAuthLabelClass,
} from "@/app/components/marketing/fleet/fleet-auth-layout";

type SignupFormProps = {
  source?: string;
};

export function SignupForm({ source = "" }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signupAction, {} as SignupState);
  const [authOrigin, setAuthOrigin] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
    []
  );
  const canSubmit = !turnstileEnabled || turnstileToken.length > 0;

  useEffect(() => {
    setAuthOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const verificationPending = Boolean(state?.verificationPending && state?.pendingEmail);

  if (verificationPending && state.pendingEmail) {
    return (
      <div className="space-y-6">
        <VerificationPendingContent
          email={state.pendingEmail}
          likelyDuplicateSignup={state.likelyDuplicateSignup}
        />
        <p className="text-center text-sm text-[var(--muted)]">
          Already verified?{" "}
          <Link
            href={source ? `/login?source=${encodeURIComponent(source)}` : "/login"}
            className="font-semibold text-teal-400 hover:text-teal-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="auth_origin" value={authOrigin} readOnly />
      {state?.error && (
        <div
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {state.error}
          {process.env.NODE_ENV === "development" && state.debugDetails ? (
            <span className="mt-2 block font-mono text-xs opacity-80">{state.debugDetails}</span>
          ) : null}
        </div>
      )}
      {state?.success && (
        <div
          className="rounded-xl border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-300"
          role="status"
        >
          {state.success}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="signup-org-name" className={fleetAuthLabelClass}>
          Organization name <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <div className="relative">
          <Building2
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="signup-org-name"
            name="organization_name"
            type="text"
            autoComplete="organization"
            placeholder="Your fleet company"
            className={fleetAuthInputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="signup-email" className={fleetAuthLabelClass}>
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={fleetAuthInputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="signup-password" className={fleetAuthLabelClass}>
          Password
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={fleetAuthInputClass}
          />
        </div>
      </div>
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <TurnstileField
        resetKey={state?.error ?? "ok"}
        onTokenChange={setTurnstileToken}
        className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3"
      />
      <button type="submit" disabled={isPending || !canSubmit} className="fm-btn-primary w-full">
        {isPending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link
          href={source ? `/login?source=${encodeURIComponent(source)}` : "/login"}
          className="font-semibold text-teal-400 hover:text-teal-300"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
