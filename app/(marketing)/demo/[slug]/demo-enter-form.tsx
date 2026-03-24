"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { enterDemoAction } from "@/app/demo/actions";
import { TurnstileField } from "@/app/components/security/turnstile-field";
import { Mail } from "lucide-react";

function EnterDemoSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Starting demo…" : "Enter Demo"}
    </button>
  );
}

type Props = {
  industrySlug: string;
  industryLabel: string;
};

export function DemoEnterForm({ industrySlug, industryLabel }: Props) {
  const [state, formAction] = useActionState(enterDemoAction, {});
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
    []
  );
  const canSubmit = !turnstileEnabled || turnstileToken.length > 0;

  if (state?.success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">You&apos;re all set</h1>
        <p className="mt-2 text-[var(--muted)]">
          If your email is valid, you&apos;ll receive next steps shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
        Launch your live demo
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Enter your work email to explore the <strong>{industryLabel}</strong> demo environment.
      </p>

      {state?.error && (
        <div
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="industry_slug" value={industrySlug} />
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <div>
          <label htmlFor="demo-email" className="block text-sm font-semibold text-[var(--foreground)]">
            Work email <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
            <input
              id="demo-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-3 pl-10 pr-4 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="demo-company" className="block text-sm font-semibold text-[var(--foreground)]">
            Company name <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <input
            id="demo-company"
            name="company_name"
            type="text"
            autoComplete="organization"
            placeholder="Your company"
            className="mt-1.5 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-3 px-4 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <TurnstileField
          resetKey={state?.error ?? "ok"}
          onTokenChange={setTurnstileToken}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3"
        />
        <EnterDemoSubmitButton disabled={!canSubmit} />
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        No scheduling required. Explore a live environment with realistic seeded data.
      </p>
    </div>
  );
}
