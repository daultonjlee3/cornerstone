import { PriorityStripe } from "./PriorityStripe";

type DispatchCardProps = {
  priority: string | null | undefined;
  isOverdue?: boolean;
  isSlaBreached?: boolean;
  isDragging?: boolean;
  className?: string;
  /** Optional extra class for the content wrapper (e.g. padding). */
  contentClassName?: string;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function DispatchCard({
  priority,
  isOverdue = false,
  isSlaBreached = false,
  isDragging = false,
  className = "",
  contentClassName,
  children,
  onMouseEnter,
  onMouseLeave,
}: DispatchCardProps) {
  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative overflow-hidden rounded-md border bg-white/95 pl-2 shadow-[0_1px_3px_rgba(16,35,63,0.08)] transition-all duration-150 ${
        isOverdue
          ? "border-red-200/90 bg-red-50/55 ring-1 ring-red-100"
          : isSlaBreached
            ? "border-red-200/90 bg-red-50/35 ring-1 ring-red-100"
          : "border-[var(--card-border)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(16,35,63,0.12)]"
      } ${isDragging ? "opacity-90 shadow-[0_8px_20px_rgba(16,35,63,0.16)]" : ""} ${className}`}
    >
      <PriorityStripe priority={priority} />
      <div className={`p-2 ${contentClassName ?? ""}`}>{children}</div>
    </article>
  );
}
