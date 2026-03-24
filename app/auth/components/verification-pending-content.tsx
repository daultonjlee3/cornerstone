"use client";

import { ResendVerificationSection } from "./resend-verification-section";

type VerificationPendingContentProps = {
  email: string;
};

/**
 * Polished copy for post-signup email verification (and similar login context).
 */
export function VerificationPendingContent({ email }: VerificationPendingContentProps) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Account created. Please verify your email before signing in.
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          We sent a verification link to{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">{email}</span>. If you do
          not see it, check your spam folder or resend the email below.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Still nothing after resending? In the Supabase Dashboard go to{" "}
          <span className="font-medium">Authentication → Emails</span> and confirm custom SMTP (e.g.
          Resend) is connected, the sender domain is verified, and{" "}
          <span className="font-medium">Redirect URLs</span> include this app&apos;s URL (e.g. your
          Vercel URL or <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">localhost</code>
          ).
        </p>
      </div>
      <ResendVerificationSection email={email} />
    </div>
  );
}
