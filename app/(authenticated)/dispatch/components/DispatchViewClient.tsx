"use client";

import dynamic from "next/dynamic";
import type { LoadDispatchResult } from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";

// The dispatch board uses dnd-kit; loading it only on the client avoids
// SSR/client hydration mismatches (e.g. aria-describedby DndDescribedBy-0 vs DndDescribedBy-1).
const DispatchView = dynamic(
  () => import("./DispatchView").then((mod) => mod.DispatchView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center text-sm text-[var(--muted)]">
        Loading dispatch board…
      </div>
    ),
  }
);

type DispatchViewClientProps = {
  initialData: LoadDispatchResult;
  filterState: DispatchFilterState;
};

export function DispatchViewClient({ initialData, filterState }: DispatchViewClientProps) {
  return <DispatchView initialData={initialData} filterState={filterState} />;
}
