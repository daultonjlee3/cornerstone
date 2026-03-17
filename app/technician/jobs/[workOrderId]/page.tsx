import { redirect } from "next/navigation";

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
  redirect(`/portal/work-orders/${workOrderId}`);
}
