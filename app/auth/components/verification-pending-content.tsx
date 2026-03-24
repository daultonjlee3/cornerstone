"use client";

import { ResendVerificationSection } from "./resend-verification-section";

type VerificationPendingContentProps = {
  email: string;
  /** Heuristic: signUp returned no identities — often email already registered; no new mail may be sent. */
  likelyDuplicateSignup?: boolean;
};

/**
 * Polished copy for post-signup email verification (and similar login context).
 */
export function VerificationPendingContent({
  email,
  likelyDuplicateSignup,
}: VerificationPendingContentProps) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Account created. Please verify your email before signing in.
        </h3>
        {likelyDuplicateSignup ? (
          <div
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            <p className="font-medium">This email may already be registered.</p>
            <p className="mt-2 leading-relaxed text-amber-900/95 dark:text-amber-100/90">
              Supabase often does not send another verification email if you sign up again with the
              same address. Try <strong>Sign in</strong> below, or use{" "}
              <strong>Forgot password</strong> on the login page if you need access.
            </p>
          </div>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          We sent a verification link to{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">{email}</span>. If you do
          not see it, check your spam folder or resend the email below.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Still nothing after resending? In the Supabase Dashboard:{" "}
          <span className="font-medium">Authentication → Providers → Email</span> — confirm{" "}
          <span className="font-medium">Confirm email</span> is enabled;{" "}
          <span className="font-medium">Authentication → Emails</span> — custom SMTP (e.g. Resend) is
          saved; sender domain verified in Resend;{" "}
          <span className="font-medium">URL Configuration → Redirect URLs</span> includes this
          app&apos;s origin (e.g.{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">http://localhost:3000/**</code>
          ). Check <span className="font-medium">Logs</span> for auth/email errors.
        </p>
      </div>
      <ResendVerificationSection email={email} />
    </div>
  );
}
