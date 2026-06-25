import { can } from "@/src/lib/permissions";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ConnectorDetailClient } from "@/app/(authenticated)/implementation/components/connector-detail-client";

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireImplementationAccess();
  const { key } = await params;
  const canManage = await can("integrations.manage");
  return <ConnectorDetailClient connectorKey={key} canManage={canManage} />;
}
