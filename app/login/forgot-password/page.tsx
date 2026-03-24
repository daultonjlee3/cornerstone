import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot password | Cornerstone OS",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)] p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Forgot password?</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter your email and we&apos;ll send a password reset link if an account exists.
        </p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-4 inline-block text-sm text-[var(--muted)] hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
