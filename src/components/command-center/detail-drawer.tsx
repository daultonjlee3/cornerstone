"use client";

import { useIsLg } from "@/src/lib/use-media-query";

export type DetailDrawerProps = {
  /** Content of the drawer (header + body). Use DetailHeader and DetailActionBar inside. */
  children: React.ReactNode;
  /** Optional class for the scrollable body wrapper. */
  className?: string;
};

/**
 * Wraps detail pane content so it scrolls correctly in both inline (desktop) and overlay (tablet/mobile) modes.
 * Use inside CommandCenterLayout's detailContent slot.
 */
export function DetailDrawer({ children, className = "" }: DetailDrawerProps) {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export type DetailDrawerBodyProps = {
  children: React.ReactNode;
  /** Optional class for the scrollable area. */
  className?: string;
};

/** Scrollable body for the detail pane. Place below DetailHeader / DetailActionBar. */
export function DetailDrawerBody({ children, className = "" }: DetailDrawerBodyProps) {
  return (
    <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`}>
      {children}
    </div>
  );
}
