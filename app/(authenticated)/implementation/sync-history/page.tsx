import { can } from "@/src/lib/permissions";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationSyncHistoryClient } from "@/app/(authenticated)/implementation/components/implementation-sync-history-client";

export default async function ImplementationSyncHistoryPage() {
  await requireImplementationAccess();
  const canManage = await can("integrations.manage");
  return <ImplementationSyncHistoryClient canManage={canManage} />;
}
