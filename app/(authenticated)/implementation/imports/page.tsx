import { can } from "@/src/lib/permissions";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationImportsClient } from "@/app/(authenticated)/implementation/components/implementation-imports-client";

export default async function ImplementationImportsPage() {
  await requireImplementationAccess();
  const canManage = await can("integrations.manage");
  return <ImplementationImportsClient canManage={canManage} />;
}
