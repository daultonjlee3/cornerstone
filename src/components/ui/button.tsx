import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)]",
  secondary:
    "border border-[var(--card-border)] bg-white/90 text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-white focus:ring-[var(--accent)]",
  ghost:
    "text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:ring-[var(--accent)]",
  danger: "border border-red-300 bg-red-500 text-white shadow-sm hover:bg-red-600 focus:ring-red-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}
