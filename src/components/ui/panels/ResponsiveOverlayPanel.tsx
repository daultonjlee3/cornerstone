"use client";

import type { ReactNode } from "react";

type ResponsiveOverlayPanelProps = {
  children: ReactNode;
  className?: string;
  /**
   * Z-index class to ensure the panel sits above the correct backdrop/highlights.
   * Example: "z-50", "z-[10001]".
   */
  zIndexClassName?: string;
};

function join(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Shared overlay positioning system:
 * - Mobile (<768): bottom sheet (full width, ~85vh max)
 * - Tablet (>=768 & <1024): slide-over (anchored right, full height)
 * - Desktop (>=1024): right panel (top ~96px, safe right inset 24px)
 *
 * This is designed so the panel cannot render off-screen.
 */
export function ResponsiveOverlayPanel({
  children,
  className,
  zIndexClassName = "z-[10001]",
}: ResponsiveOverlayPanelProps) {
  return (
    <div
      className={join(
        zIndexClassName,
        "fixed",
        // Base: bottom sheet
        "bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto",
        "rounded-t-[var(--radius-card)] rounded-b-none",
        "border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-card)]",
        "overscroll-contain",
        // Tablet: slide-over anchored to the right
        "md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-full md:w-[88vw] md:max-w-[420px]",
        "md:rounded-[var(--radius-card)] md:rounded-r-none",
        // Desktop: right panel with safe inset
        "lg:top-24 lg:bottom-auto lg:right-6 lg:h-auto lg:left-auto lg:max-h-[calc(100vh-120px)]",
        "lg:w-[clamp(320px,30vw,400px)] lg:max-w-[420px]",
        "lg:rounded-[var(--radius-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

