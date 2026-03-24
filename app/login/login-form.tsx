"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { LoginVerificationNotice } from "@/app/auth/components/login-verification-notice";

type LoginFormProps = {
  /** Post-login redirect; also used for verification email callback. */
  next?: string;
  demoEmail?: string;
  demoLabel?: string;
  /** Server-provided; pre-fills password field (masked). Not exposed in client bundle. */
  demoPassword?: string;
};

const inputBase =
  "w-full min-h-[52px] rounded-xl border bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-500 transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] dark:bg-slate-700/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:border-slate-600 dark:hover:border-slate-500 sm:min-h-0 sm:text-[15px]";

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
    <form action={formAction} className="space-y-6 sm:space-y-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isDemo ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          Sign in to open the <strong>{demoLabel}</strong> demo.
          {demoPassword
            ? " Credentials are pre-filled—just click Sign in."
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
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      <div className="space-y-2">
        <label
          htmlFor="login-email"
          className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
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
            className={`${inputBase} border-slate-200 hover:border-slate-300 dark:hover:border-slate-500`}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <Link
            href="/login/forgot-password"
            className="inline-block py-2 pr-1 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded min-h-[44px] sm:min-h-0 sm:py-0 sm:pr-0"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
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
            className={`${inputBase} border-slate-200 hover:border-slate-300 dark:hover:border-slate-500`}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[52px] rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:transition-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[15px] text-slate-600 dark:text-slate-300">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="inline-block py-2 font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded sm:py-0"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
