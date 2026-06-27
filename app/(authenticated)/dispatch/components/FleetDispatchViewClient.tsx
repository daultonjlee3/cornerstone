"use client";

import { FleetDispatchView } from "./FleetDispatchView";
import type { FleetDispatchBoardData } from "@/src/types/fleet";

type FleetDispatchViewClientProps = {
  initialBoard: FleetDispatchBoardData;
  selectedDate: string;
};

export function FleetDispatchViewClient({
  initialBoard,
  selectedDate,
}: FleetDispatchViewClientProps) {
  return (
    <FleetDispatchView initialBoard={initialBoard} selectedDate={selectedDate} />
  );
}
