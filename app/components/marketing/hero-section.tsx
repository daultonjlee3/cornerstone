import type { ReactNode } from "react";

type Props = {
  headline: ReactNode;
  subheadline?: ReactNode;
  /** Primary and secondary CTAs (e.g. Link components) */
  actions?: ReactNode;
  /** Optional credibility strip between hero copy and screenshot */
  credibilityStrip?: ReactNode;
  /** Optional content below hero (e.g. screenshot) */
  children?: ReactNode;
  /** Center content and constrain width for hero copy */
  centered?: boolean;
  className?: string;
};

export function HeroSection({
  headline,
  subheadline,
  actions,
  credibilityStrip,
  children,
  centered = true,
  className = "",
}: Props) {
  return (
    <section
      className={`relative min-w-0 overflow-hidden px-4 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-28 ${className}`}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        {/* Hero copy: constrained width for readability (750–900px) */}
        <div
          className={
            centered
              ? "mx-auto max-w-4xl text-center"
              : "max-w-4xl"
          }
        >
          <h1 className="mk-hero-headline break-words">{headline}</h1>
          {subheadline && (
            <p className="mt-4 sm:mt-6 mk-subheadline sm:text-xl">{subheadline}</p>
          )}
          {actions && (
            <div className="mt-8 flex w-full flex-col items-stretch gap-4 sm:mt-10 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
              {actions}
            </div>
          )}
        </div>

        {/* Credibility strip: compact row, visually separate from screenshot */}
        {credibilityStrip && (
          <div className="mx-auto mt-6 max-w-4xl sm:mt-8">
            <div className="border-b border-[var(--card-border)]/60 pb-8 sm:pb-10">
              {credibilityStrip}
            </div>
          </div>
        )}

        {/* Screenshot frame: subtle overlap on larger screens, clear separation on mobile */}
        {children && (
          <div className="mx-auto mt-8 w-full max-w-5xl px-0 sm:-mt-6 lg:-mt-8">
            <div className="overflow-hidden rounded-xl border border-[var(--card-border)]/80 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] transition-shadow dark:border-[var(--card-border)]/60 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.04)] sm:rounded-2xl">
              {children}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
