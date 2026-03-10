import { PriorityStripe } from "./PriorityStripe";

type DispatchCardProps = {
  priority: string | null | undefined;
  isOverdue?: boolean;
  isDragging?: boolean;
  className?: string;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function DispatchCard({
  priority,
  isOverdue = false,
  isDragging = false,
  className = "",
  children,
  onMouseEnter,
  onMouseLeave,
}: DispatchCardProps) {
  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative overflow-hidden rounded-xl border bg-[var(--card)] pl-3 shadow-[var(--shadow-soft)] transition-all duration-200 ${
        isOverdue
          ? "border-red-200/90 bg-red-50/50 ring-1 ring-red-100"
          : "border-[var(--card-border)] hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
      } ${isDragging ? "opacity-90 shadow-lg" : ""} ${className}`}
    >
      <PriorityStripe priority={priority} />
      <div className="p-3">{children}</div>
    </article>
  );
}
