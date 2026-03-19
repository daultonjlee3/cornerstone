import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  variant?: "default" | "alt";
  className?: string;
};

export function FeatureSection({
  title,
  subtitle,
  children,
  variant = "default",
  className = "",
}: Props) {
  return (
    <section
      className={[
        "min-w-0 px-4 py-10 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-24",
        variant === "alt" ? "mk-section-alt" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="text-center">
          <h2 className="mk-section-headline">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-2xl px-1 mk-body-lg sm:mt-4 sm:px-0">{subtitle}</p>
          )}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:gap-8 lg:grid-cols-2 lg:gap-10 xl:grid-cols-3">
          {children}
        </div>
      </div>
    </section>
  );
}
