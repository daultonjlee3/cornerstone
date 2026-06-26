"use client";

import { memo } from "react";
import { resolveIconSize } from "./tokens";
import type { FleetClusterProps } from "./types";

export const FleetCluster = memo(function FleetCluster({
  count,
  kind = "truck",
  size = "md",
}: FleetClusterProps) {
  const px = resolveIconSize(size);
  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className={`cs-cluster cs-cluster--${kind}`}
      style={{ "--cs-cluster-size": `${px}px` } as React.CSSProperties}
      aria-label={`${count} ${kind}${count === 1 ? "" : "s"}`}
    >
      <span className="cs-cluster__ring cs-cluster__ring--outer" />
      <span className="cs-cluster__ring cs-cluster__ring--inner" />
      <span className="cs-cluster__core">
        <span className="cs-cluster__count">{label}</span>
      </span>
    </span>
  );
});
