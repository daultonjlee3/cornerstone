import { redirect } from "next/navigation";
import { ComingSoon } from "../components/coming-soon";
import { featureFlags } from "@/src/lib/features";

export const metadata = {
  title: "Invoices | Cornerstone Tech",
  description: "Billing & payments",
};

export default function InvoicesPage() {
  if (!featureFlags.invoicing) {
    redirect("/operations");
  }
  return <ComingSoon moduleName="Invoices" />;
}
