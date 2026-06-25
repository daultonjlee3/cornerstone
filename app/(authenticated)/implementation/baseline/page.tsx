import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationBaselineClient } from "@/app/(authenticated)/implementation/components/implementation-baseline-client";

export default async function ImplementationBaselinePage() {
  await requireImplementationAccess();
  return <ImplementationBaselineClient />;
}
