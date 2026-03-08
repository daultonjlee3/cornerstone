import Link from "next/link";
import { signupAction } from "./actions";
import { AuthForm } from "../components/auth-form";

export const metadata = {
  title: "Sign up | Cornerstone Tech",
  description: "Create your account",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-600 dark:bg-slate-800">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Cornerstone Tech
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your account
            </p>
          </div>
          <AuthForm
            action={signupAction}
            submitLabel="Sign up"
            fields={[
              { name: "full_name", type: "text", label: "Full name", required: false, autoComplete: "name" },
              { name: "email", type: "email", label: "Email", required: true, autoComplete: "email" },
              { name: "password", type: "password", label: "Password", required: true, autoComplete: "new-password" },
            ]}
          />
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
