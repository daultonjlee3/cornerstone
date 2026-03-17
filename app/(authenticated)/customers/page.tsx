import { redirect } from "next/navigation";
import { ComingSoon } from "@/app/components/coming-soon";
import { featureFlags } from "@/src/lib/features";

export const metadata = {
  title: "Customers | Cornerstone Tech",
  description: "Tenants & clients",
};

export default function CustomersPage() {
  if (!featureFlags.customers) {
    redirect("/operations");
  }
  return <ComingSoon moduleName="Customers" description="Tenants & clients" />;
}
