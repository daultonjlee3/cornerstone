import type { ReactNode } from "react";

type Props = {
  price: ReactNode;
  period?: ReactNode;
  minimum?: ReactNode;
  description?: ReactNode;
  features?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function PricingCard({
  price,
  period,
  minimum,
  description,
  features,
  primaryAction,
  secondaryAction,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[0_24px_48px_-12px_rgba(16,35,63,0.12)] sm:p-8 ${className}`}
    >
      <div className="text-center">
        <div className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          {price}
          {period && (
            <span className="text-xl font-normal text-[var(--muted)]">
              {" "}{period}
            </span>
          )}
        </div>
        {minimum && (
          <p className="mt-2 text-lg text-[var(--muted)]">{minimum}</p>
        )}
        {description && (
          <p className="mt-6 mk-caption">{description}</p>
        )}
        {features && <div className="mt-8 text-left">{features}</div>}
        <div className="mt-8">{primaryAction}</div>
        {secondaryAction && (
          <div className="mt-4 text-center">{secondaryAction}</div>
        )}
      </div>
    </div>
  );
}
