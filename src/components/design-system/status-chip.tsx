import type { ChipTone } from "./types";

type StatusChipProps = {
  label: string;
  tone?: ChipTone;
  showDot?: boolean;
  className?: string;
};

export function statusChipClass(tone: ChipTone): string {
  return `cs-chip cs-chip--${tone}`;
}

export function statusDotClass(tone: ChipTone): string {
  return `cs-dot cs-dot--${tone}`;
}

export function StatusChip({
  label,
  tone = "neutral",
  showDot = true,
  className = "",
}: StatusChipProps) {
  return (
    <span className={`${statusChipClass(tone)} ${className}`}>
      {showDot ? <span className={statusDotClass(tone)} aria-hidden /> : null}
      {label}
    </span>
  );
}
