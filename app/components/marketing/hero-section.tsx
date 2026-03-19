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
      className={`relative min-w-0 overflow-hidden px-4 py-10 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-24 ${className}`}
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
            <p className="mt-3 sm:mt-5 mk-subheadline md:text-lg">{subheadline}</p>
          )}
          {actions && (
            <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              {actions}
            </div>
          )}
        </div>

        {/* Credibility strip: compact row, visually separate from screenshot */}
        {credibilityStrip && (
          <div className="mx-auto mt-5 max-w-4xl sm:mt-8">
            <div className="border-b border-[var(--card-border)]/60 pb-6 sm:pb-10">
              {credibilityStrip}
            </div>
          </div>
        )}

        {/* Screenshot frame: prevent overflow, maintain aspect ratio */}
        {children && (
          <div className="mx-auto mt-6 w-full min-w-0 max-w-5xl px-0 sm:-mt-4 lg:-mt-6">
            <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)]/80 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] transition-shadow dark:border-[var(--card-border)]/60 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.04)] sm:rounded-2xl">
              {children}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
