import {
  cloneElement,
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--brand-action)] text-white shadow-[var(--elevation-1)] hover:bg-[var(--brand-action-hover)] focus:ring-[var(--brand-action)]",
  secondary:
    "border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--elevation-0)] hover:bg-[var(--surface-default)] focus:ring-[var(--brand-action)]",
  ghost:
    "text-[var(--text-primary)] hover:bg-[var(--surface-default)] focus:ring-[var(--brand-action)]",
  danger:
    "border border-transparent bg-[var(--status-danger)] text-white shadow-[var(--elevation-1)] hover:opacity-90 focus:ring-[var(--status-danger)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

const buttonClassName = (variant: ButtonVariant, size: ButtonSize, className: string) =>
  `inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-medium transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = "primary", size = "md", className = "", asChild = false, ...props },
  ref
) {
  const resolvedClassName = buttonClassName(variant, size, className);

  if (asChild && typeof children === "object" && children !== null && "type" in (children as ReactElement)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: [child.props?.className, resolvedClassName].filter(Boolean).join(" "),
    });
  }

  return (
    <button ref={ref} {...props} className={resolvedClassName}>
      {children}
    </button>
  );
});
