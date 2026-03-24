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
      </div>
      <ResendVerificationSection email={email} />
    </div>
  );
}
