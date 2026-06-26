import { FleetMissionControlLoader } from "@/src/components/fleet-intelligence/FleetMissionControlLoader";

/** Mission Control loader while operations intelligence data fetches. */
export default function ReportsOperationsLoading() {
  return (
    <FleetMissionControlLoader
      variant="page"
      testId="fleet-performance-loading"
      title="Fleet Performance"
      messages={[
        "Aggregating utilization metrics…",
        "Loading branch performance…",
        "Building intelligence report…",
      ]}
    />
  );
}
