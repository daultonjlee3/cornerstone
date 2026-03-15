import Link from "next/link";

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
          Contact your administrator to reset your password, or sign in with your existing
          credentials.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
