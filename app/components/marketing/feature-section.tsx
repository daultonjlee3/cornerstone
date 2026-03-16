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
        "min-w-0 px-4 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24",
        variant === "alt" ? "mk-section-alt" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="text-center">
          <h2 className="mk-section-headline">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl px-2 mk-body-lg sm:px-0">{subtitle}</p>
          )}
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10">
          {children}
        </div>
      </div>
    </section>
  );
}
