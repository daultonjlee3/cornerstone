import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { TechnicianJobExecutionView } from "../../components/technician-job-execution-view";
import { getTechnicianExecutionPayload } from "@/src/lib/work-orders/technician-execution-service";

export const metadata = {
  title: "Technician Job Execution | Cornerstone Tech",
  description: "Execute assigned and crew work orders in the technician portal",
};

export default async function TechnicianJobExecutionPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const payload = await getTechnicianExecutionPayload(workOrderId, {
    supabase: supabase as unknown as SupabaseClient,
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
        <Link href="/technician/jobs" className="hover:text-[var(--foreground)]">
          My Jobs
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
