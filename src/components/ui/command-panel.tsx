import type { ReactNode } from "react";
import { Panel } from "@/src/components/design-system";
import { SectionHeader } from "@/src/components/design-system";

export function CommandPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel level="raised" padding="md" className={className}>
      <SectionHeader title={title} description={description} className="mb-4" />
      {children}
    </Panel>
  );
}
