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
      className={`group relative overflow-hidden rounded-[var(--radius-control)] border bg-white/94 pl-3 shadow-[var(--shadow-soft)] transition-all duration-200 ${
        isOverdue
          ? "border-red-200/90 bg-red-50/50 ring-1 ring-red-100"
          : isSlaBreached
            ? "border-red-200/90 bg-red-50/35 ring-1 ring-red-100"
          : "border-[var(--card-border)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-card)]"
      } ${isDragging ? "opacity-90 shadow-[var(--shadow-card)]" : ""} ${className}`}
    >
      <PriorityStripe priority={priority} />
      <div className={`p-2.5 ${contentClassName ?? ""}`}>{children}</div>
    </article>
  );
}
