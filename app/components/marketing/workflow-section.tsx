import type { ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  steps: readonly string[];
  className?: string;
};

export function WorkflowSection({
  title,
  subtitle,
  steps,
  className = "",
}: Props) {
  return (
    <section
      className={`px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 ${className}`}
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center mk-section-headline">{title}</h2>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-center mk-body-lg">
            {subtitle}
          </p>
        )}
        {/* Mobile: vertical timeline */}
        <div className="mt-10 flex flex-col items-center gap-0 md:hidden">
          {steps.map((step, i) => (
            <span key={step} className="flex flex-col items-center gap-0">
              <span className="w-full max-w-xs rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-center text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft)]">
                {step}
              </span>
              {i < steps.length - 1 && (
                <ArrowDown
                  className="my-1 h-5 w-5 shrink-0 text-[var(--muted)]"
                  aria-hidden
                />
              )}
            </span>
          ))}
        </div>
        {/* Desktop: horizontal flow */}
        <div className="mt-12 hidden flex-wrap items-center justify-center gap-4 sm:gap-6 md:flex">
          {steps.map((step, i) => (
            <span key={step} className="flex items-center gap-4">
              <span className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]">
                {step}
              </span>
              {i < steps.length - 1 && (
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-[var(--muted)]"
                  aria-hidden
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
