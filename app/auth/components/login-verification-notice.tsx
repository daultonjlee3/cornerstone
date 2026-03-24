"use client";

import { ResendVerificationSection } from "./resend-verification-section";

type LoginVerificationNoticeProps = {
  email: string;
  /** Matches login `next` / default post-auth destination after email verify. */
  redirectNext?: string;
};

/**
 * Shown on login when Supabase reports email not confirmed.
 */
export function LoginVerificationNotice({ email, redirectNext }: LoginVerificationNoticeProps) {
  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
      <div>
        <h3 className="text-base font-semibold text-amber-950 dark:text-amber-100">
          Email verification required
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          This email still needs to be verified before you can sign in. Check your inbox for a
          confirmation link, or request a new one below.
        </p>
      </div>
      <ResendVerificationSection email={email} redirectNext={redirectNext} />
    </div>
  );
}
