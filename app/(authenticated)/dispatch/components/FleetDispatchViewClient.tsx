"use client";

import dynamic from "next/dynamic";
import type { FleetDispatchBoardData } from "@/src/types/fleet";

const FleetDispatchView = dynamic(
  () => import("./FleetDispatchView").then((mod) => mod.FleetDispatchView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center text-sm text-[var(--muted)]">
        Loading fleet dispatch board…
      </div>
    ),
  }
);

type FleetDispatchViewClientProps = {
  initialBoard: FleetDispatchBoardData;
  selectedDate: string;
};

export function FleetDispatchViewClient({ initialBoard, selectedDate }: FleetDispatchViewClientProps) {
  return <FleetDispatchView initialBoard={initialBoard} selectedDate={selectedDate} />;
}
