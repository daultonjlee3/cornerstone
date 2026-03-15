import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  actions: ReactNode;
  variant?: "default" | "card";
  className?: string;
};

export function CTASection({
  title,
  description,
  actions,
  variant = "default",
  className = "",
}: Props) {
  const content = (
    <>
      <h2 className="mk-section-headline">{title}</h2>
      {description && <p className="mt-4 mk-body-lg">{description}</p>}
      <div className="mt-8 flex w-full flex-col items-stretch gap-4 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        {actions}
      </div>
    </>
  );

  if (variant === "card") {
    return (
      <section
        className={`px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 ${className}`}
      >
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow-soft)] sm:p-8">
            {content}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 ${className}`}
    >
      <div className="mx-auto max-w-2xl text-center">{content}</div>
    </section>
  );
}
