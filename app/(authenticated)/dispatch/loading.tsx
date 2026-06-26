import { FleetMissionControlLoader } from "@/src/components/fleet-intelligence/FleetMissionControlLoader";

/** Mission Control loader while the dispatch board server component fetches data. */
export default function DispatchLoading() {
  return (
    <FleetMissionControlLoader
      variant="page"
      testId="dispatch-loading"
      messages={[
        "Syncing dispatch assignments…",
        "Loading fleet positions…",
        "Preparing recommendation queue…",
      ]}
    />
  );
}
