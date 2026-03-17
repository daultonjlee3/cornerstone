import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  description,
  required = false,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="ui-label">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {description ? <p className="mt-1 text-xs text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
