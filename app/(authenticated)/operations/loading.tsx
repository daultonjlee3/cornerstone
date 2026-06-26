import { FleetMissionControlLoader } from "@/src/components/fleet-intelligence/FleetMissionControlLoader";

/** Mission Control loader while the Fleet Command Center server component fetches dashboard data. */
export default function OperationsLoading() {
  return (
    <FleetMissionControlLoader
      variant="page"
      testId="operations-center-loading"
      messages={[
        "Syncing operational feed…",
        "Loading fleet health signals…",
        "Preparing command center…",
      ]}
    />
  );
}
