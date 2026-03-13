import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { TechnicianJobExecutionView } from "@/app/technician/components/technician-job-execution-view";
import { getTechnicianExecutionPayload } from "@/src/lib/work-orders/technician-execution-service";
import { resolvePortalAccessContext } from "@/src/lib/portal/access";

export const metadata = {
  title: "Portal Work Order Execution | Cornerstone Tech",
  description: "Execute assigned jobs from technician portal",
};

export default async function PortalWorkOrderExecutionPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = await params;
  const supabase = await createClient();
  const context = await resolvePortalAccessContext(
    supabase as unknown as SupabaseClient
  );
  if (!context) redirect("/login");
  if (!context.actingAsTechnician || !context.technicianId) {
    redirect("/portal/work-orders");
  }

  const payload = await getTechnicianExecutionPayload(workOrderId, {
    supabase: supabase as unknown as SupabaseClient,
    requireAssignedAccess: true,
    actorTechnicianId: context.technicianId,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Unable to load work order.";
    if (message.toLowerCase().includes("tenant membership")) redirect("/onboarding");
    if (message.toLowerCase().includes("unauthorized")) notFound();
    if (message.toLowerCase().includes("not found")) notFound();
    throw new Error(message);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/portal/work-orders" className="hover:text-[var(--foreground)]">
          My Work Orders
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {payload.workOrder.work_order_number ?? payload.workOrder.id.slice(0, 8)}
        </span>
      </div>

      <TechnicianJobExecutionView
        workOrder={payload.workOrder}
        checklistItems={payload.checklistItems}
        partUsage={payload.partUsage}
        inventoryItems={payload.inventoryItems}
        technicians={payload.technicians}
        laborEntries={payload.laborEntries}
        attachments={payload.attachments}
      />
    </div>
  );
}
