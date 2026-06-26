"use client";

import { HelpCircle } from "lucide-react";
import { AppIcon } from "@/src/components/design-system/icons";

type HelpTriggerButtonProps = {
  onClick: () => void;
};

export function HelpTriggerButton({ onClick }: HelpTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-[var(--accent)] bg-white px-3 py-2 text-sm font-medium text-[var(--accent)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent)]/5"
    >
      <AppIcon icon={HelpCircle} size="sm" intent="operational" />
      <span>How this works</span>
    </button>
  );
}
