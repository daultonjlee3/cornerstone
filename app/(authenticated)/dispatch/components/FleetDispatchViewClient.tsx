"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { FleetMissionControlLoader } from "@/src/components/fleet-intelligence/FleetMissionControlLoader";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";

const FleetDispatchView = dynamic(
  () => import("./FleetDispatchView").then((mod) => mod.FleetDispatchView),
  {
    ssr: false,
    loading: () => (
      <FleetMissionControlLoader
        variant="page"
        className="min-h-[400px]"
        testId="fleet-dispatch-client-loading"
      />
    ),
  }
);

type FleetDispatchViewClientProps = {
  initialBoard: FleetDispatchBoardData;
  initialIntel: FleetTodayViewData;
  selectedDate: string;
};

export function FleetDispatchViewClient({
  initialBoard,
  initialIntel,
  selectedDate,
}: FleetDispatchViewClientProps) {
  return (
    <Suspense
      fallback={
        <FleetMissionControlLoader
          variant="page"
          className="min-h-[400px]"
          testId="fleet-dispatch-suspense-loading"
        />
      }
    >
      <FleetDispatchView
        initialBoard={initialBoard}
        initialIntel={initialIntel}
        selectedDate={selectedDate}
      />
    </Suspense>
  );
}
