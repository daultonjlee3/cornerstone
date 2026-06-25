import { SkeletonKpiGrid, SkeletonText } from "@/src/components/design-system";

export default function FleetModuleLoading() {
  return (
    <div className="space-y-8">
      <SkeletonText lines={2} />
      <SkeletonKpiGrid count={4} />
      <SkeletonText lines={8} />
    </div>
  );
}
