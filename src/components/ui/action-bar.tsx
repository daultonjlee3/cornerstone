import type { ReactNode } from "react";

export function ActionBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`ui-action-bar p-3 ${className}`}>{children}</section>;
}
