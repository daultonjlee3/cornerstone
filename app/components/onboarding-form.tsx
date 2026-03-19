"use client";

import { useActionState } from "react";

type OnboardingFormProps = {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultTenantName?: string;
  defaultCompanyName?: string;
  source?: string;
};

export function OnboardingForm({
  action,
  defaultTenantName = "",
  defaultCompanyName = "",
  source = "",
}: OnboardingFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <input type="hidden" name="source" value={source} />
      {state?.error && (
        <p
          className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <div>
        <label
          htmlFor="tenant_name"
          className="mb-1 block text-sm font-medium text-[var(--foreground)]"
        >
          Organization name
        </label>
        <input
          id="tenant_name"
          name="tenant_name"
          type="text"
          required
          placeholder="Acme Corp"
          defaultValue={defaultTenantName}
          autoComplete="organization"
          className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>
      <div>
        <label
          htmlFor="company_name"
          className="mb-1 block text-sm font-medium text-[var(--foreground)]"
        >
          Company name
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          placeholder="Acme Property Management"
          defaultValue={defaultCompanyName}
          className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Your first operating company under this organization.
        </p>
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
      >
        Continue
      </button>
    </form>
  );
}
