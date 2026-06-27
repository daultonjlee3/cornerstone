"use client";

import dynamic from "next/dynamic";
import { memo, type ComponentProps } from "react";

const FleetOperationalMap = dynamic(
  () => import("./operational-map/FleetOperationalMap").then((mod) => mod.FleetOperationalMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full min-h-[280px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_92%,transparent)] text-sm text-[var(--text-muted)]"
        aria-busy="true"
        aria-label="Loading map"
      >
        Loading map…
      </div>
    ),
  }
);

type FleetDispatchMapPanelProps = ComponentProps<typeof FleetOperationalMap> & {
  consoleMode?: boolean;
};

export const FleetDispatchMapPanel = memo(function FleetDispatchMapPanel({
  consoleMode = true,
  ...props
}: FleetDispatchMapPanelProps) {
  return <FleetOperationalMap {...props} consoleMode={consoleMode} />;
});
