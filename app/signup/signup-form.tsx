"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Building2, Mail, Lock } from "lucide-react";
import { signupAction, type SignupState } from "./actions";
import { TurnstileField } from "@/app/components/security/turnstile-field";
import { VerificationPendingContent } from "@/app/auth/components/verification-pending-content";

const inputBase =
  "w-full min-h-[52px] rounded-xl border bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-500 transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] dark:bg-slate-700/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:border-slate-600 dark:hover:border-slate-500 sm:min-h-0 sm:text-[15px]";

type SignupFormProps = {
  source?: string;
};

export function SignupForm({ source = "" }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signupAction, {} as SignupState);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
    []
  );
  const canSubmit = !turnstileEnabled || turnstileToken.length > 0;

  const verificationPending = Boolean(state?.verificationPending && state?.pendingEmail);

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain sm:h-11 sm:w-11"
          />
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-600 transition-colors group-hover:text-[var(--accent)] dark:text-slate-300 dark:group-hover:text-slate-100">
            Cornerstone OS
          </span>
        </Link>
        <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:mt-6 sm:text-2xl">
          {verificationPending ? "Verify your email" : "Create your account"}
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-300 sm:mt-2">
          {verificationPending
            ? "One more step before you can sign in."
            : source === "demo"
              ? "Let's set up your workspace in under 2 minutes"
              : "Enter your details to get started with Cornerstone OS"}
        </p>
      </div>

      {verificationPending && state.pendingEmail ? (
        <div className="space-y-6">
          <VerificationPendingContent email={state.pendingEmail} />
          <p className="text-center text-[15px] text-slate-600 dark:text-slate-300">
            Already verified?{" "}
            <Link
              href={source ? `/login?source=${encodeURIComponent(source)}` : "/login"}
              className="inline-block py-2 font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded sm:py-0"
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-6 sm:space-y-6">
          <input type="hidden" name="source" value={source} />
          {state?.error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {state.error}
            </div>
          )}
          {state?.success && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              role="status"
            >
              {state.success}
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="signup-org-name"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Organization name (optional)
            </label>
            <div className="relative">
              <Building2
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden
              />
              <input
                id="signup-org-name"
                name="organization_name"
                type="text"
                autoComplete="organization"
                placeholder="Acme Facilities"
                className={`${inputBase} border-slate-200 hover:border-slate-300 dark:hover:border-slate-500`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="signup-email"
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
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className={`${inputBase} border-slate-200 hover:border-slate-300 dark:hover:border-slate-500`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="signup-password"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                aria-hidden
              />
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className={`${inputBase} border-slate-200 hover:border-slate-300 dark:hover:border-slate-500`}
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
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3"
          />
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="w-full min-h-[52px] rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:transition-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-[15px] text-slate-600 dark:text-slate-300">
            Already have an account?{" "}
            <Link
              href={source ? `/login?source=${encodeURIComponent(source)}` : "/login"}
              className="inline-block py-2 font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded sm:py-0"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}
