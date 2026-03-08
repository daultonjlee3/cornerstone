"use client";

import { useActionState } from "react";

type Field = {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  autoComplete?: string;
};

type AuthFormProps = {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  fields: Field[];
  hiddenFields?: { name: string; value: string }[];
};

export function AuthForm({
  action,
  submitLabel,
  fields,
  hiddenFields = [],
}: AuthFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-800"
    >
      {state?.error && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </p>
      )}
      {hiddenFields.map(({ name, value }) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map(({ name, type, label, required, autoComplete }) => (
        <div key={name}>
          <label
            htmlFor={name}
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
          <input
            id={name}
            name={name}
            type={type}
            required={required}
            autoComplete={autoComplete}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 dark:border-slate-500 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
          />
        </div>
      ))}
      <button
        type="submit"
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
