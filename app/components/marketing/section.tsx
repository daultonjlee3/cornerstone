import type { ReactNode } from "react";

type Variant = "default" | "alt" | "narrow" | "tight";

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  /** Section id for anchor links */
  id?: string;
};

const variantClasses: Record<Variant, string> = {
  default: "",
  alt: "mk-section-alt",
  narrow: "",
  tight: "",
};

const maxWidthClasses: Record<Variant, string> = {
  default: "max-w-7xl",
  alt: "max-w-7xl",
  narrow: "max-w-4xl",
  tight: "max-w-3xl",
};

export function Section({
  children,
  variant = "default",
  className = "",
  id,
}: Props) {
  return (
    <section
      id={id}
      className={[
        "px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20",
        variantClasses[variant],
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className={`mx-auto ${maxWidthClasses[variant]}`}>{children}</div>
    </section>
  );
}
