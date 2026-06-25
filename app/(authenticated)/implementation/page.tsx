import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationOverviewClient } from "@/app/(authenticated)/implementation/components/implementation-overview-client";

export default async function ImplementationOverviewPage() {
  await requireImplementationAccess();
  return <ImplementationOverviewClient />;
}
