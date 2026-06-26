"use client";

import { memo } from "react";

/**
 * The canonical Cornerstone truck silhouette.
 * One shape — status is expressed via color, ring, badge, and motion only.
 */
export const CornerstoneTruckSvg = memo(function CornerstoneTruckSvg({
  className,
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 32" fill="none" className={className} aria-hidden>
      <path d="M12 2.5v4.75" className="cs-truck__needle" strokeLinecap="round" />
      <rect x="7.5" y="8.25" width="9" height="5.75" rx="2" className="cs-truck__cab" />
      <rect x="5.5" y="14.25" width="13" height="11.75" rx="3" className="cs-truck__body" />
      <circle cx="9" cy="24.75" r="2" className="cs-truck__wheel" />
      <circle cx="15" cy="24.75" r="2" className="cs-truck__wheel" />
    </svg>
  );
});
