import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationReadinessClient } from "@/app/(authenticated)/implementation/components/implementation-readiness-client";

export default async function ImplementationReadinessPage() {
  await requireImplementationAccess();
  return <ImplementationReadinessClient />;
}
