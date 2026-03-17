import { redirect } from "next/navigation";
import { ComingSoon } from "../components/coming-soon";
import { featureFlags } from "@/src/lib/features";

export const metadata = {
  title: "Contracts | Cornerstone Tech",
  description: "Agreements & terms",
};

export default function ContractsPage() {
  if (!featureFlags.contracts) {
    redirect("/operations");
  }
  return <ComingSoon moduleName="Contracts" />;
}
