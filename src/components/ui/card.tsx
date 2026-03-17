import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <header className={`border-b border-[var(--card-border)]/90 px-5 py-4 ${className}`}>
      {children}
    </header>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-base font-semibold tracking-tight text-[var(--foreground)] ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`mt-1 text-sm text-[var(--muted)] ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
