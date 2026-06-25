import { can } from "@/src/lib/permissions";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationConnectionsClient } from "@/app/(authenticated)/implementation/components/implementation-connections-client";

export default async function ImplementationConnectionsPage() {
  await requireImplementationAccess();
  const canManage = await can("integrations.manage");
  return <ImplementationConnectionsClient canManage={canManage} />;
}
