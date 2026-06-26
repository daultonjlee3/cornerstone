"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { LoginVerificationNotice } from "@/app/auth/components/login-verification-notice";
import {
  fleetAuthInputClass,
  fleetAuthLabelClass,
} from "@/app/components/marketing/fleet/fleet-auth-layout";

type LoginFormProps = {
  next?: string;
  demoEmail?: string;
  demoLabel?: string;
  demoPassword?: string;
};

export function LoginForm({ next, demoEmail, demoLabel, demoPassword }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, {} as LoginState);
  const [email, setEmail] = useState(demoEmail ?? "");
  const isDemo = Boolean(demoEmail && demoLabel);
  const verificationRedirectNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/operations";

  useEffect(() => {
    if (demoEmail) setEmail(demoEmail);
  }, [demoEmail]);

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isDemo ? (
        <p className="rounded-xl border border-teal-400/20 bg-teal-400/5 px-4 py-3 text-sm text-[var(--muted)]">
          Sign in to open the <strong className="text-[var(--foreground)]">{demoLabel}</strong> demo.
          {demoPassword
            ? " Credentials are pre-filled — just click Sign in."
            : " Use the demo account below."}
        </p>
      ) : null}
      {state?.needsVerification ? (
        <LoginVerificationNotice
          email={email.trim() || demoEmail || ""}
          redirectNext={verificationRedirectNext}
        />
      ) : null}
      {state?.error && !state?.needsVerification ? (
        <div
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="login-email" className={fleetAuthLabelClass}>
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fleetAuthInputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="login-password" className={fleetAuthLabelClass}>
            Password
          </label>
          <Link
            href="/login/forgot-password"
            className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            defaultValue={demoPassword}
            className={fleetAuthInputClass}
          />
        </div>
      </div>
      <button type="submit" disabled={isPending} className="fm-btn-primary w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-teal-400 hover:text-teal-300">
          Create account
        </Link>
      </p>
    </form>
  );
}
