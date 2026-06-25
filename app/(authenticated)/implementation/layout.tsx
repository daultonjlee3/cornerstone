import type { ReactNode } from "react";
import { Rocket } from "lucide-react";
import { PageHeader } from "@/src/components/ui/page-header";
import { ImplementationNav } from "@/app/(authenticated)/implementation/components/implementation-nav";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";

export default async function ImplementationLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireImplementationAccess();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Rocket className="size-5" />}
        title="Implementation Center"
        subtitle="Connect systems, import data, establish baseline, and reach operational readiness through Connected Systems."
        variant="surface"
      />
      <ImplementationNav />
      {children}
    </div>
  );
}
