import { redirect } from "next/navigation";

export const metadata = {
  title: "Technician Workspace | Cornerstone Tech",
  description: "Technician work execution workspace",
};

export default async function TechnicianWorkPage() {
  redirect("/portal/work-orders");
}
