/** State for resend verification server action (client + server). */
export type ResendVerificationState = {
  error?: string;
  success?: string;
  /** Dev-only: raw Supabase error for debugging SMTP / redirect issues. */
  debugDetails?: string;
};
