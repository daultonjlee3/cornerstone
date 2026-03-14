import Link from "next/link";
import { BarChart2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { PageHeader } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { getAuthContext } from "@/src/lib/auth-context";
import { getMetabaseEmbedUrl } from "@/src/lib/metabase";

export const metadata = {
  title: "Reports | Cornerstone Tech",
  description: "Analytics and dashboards",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/onboarding");

  const result = getMetabaseEmbedUrl(
    ctx.tenantId ? { tenant_id: ctx.tenantId } : {}
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <PageHeader
        icon={<BarChart2 className="size-5" />}
        title="Reports"
        subtitle="Analytics dashboard for your organization. Data is scoped to your tenant and companies."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/reports/operations">
              <Button variant="secondary">Operations Intelligence</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
          </div>
        }
      />

      {!result.ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-6 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">{result.error}</p>
          <p className="mt-2 text-[var(--muted)]">
            Add METABASE_SITE_URL, METABASE_SECRET_KEY, and METABASE_DASHBOARD_ID to .env.local to embed the Metabase dashboard.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-soft)] overflow-hidden">
          <iframe
            src={result.embedUrl}
            title="Reports dashboard"
            className="h-full min-h-[calc(100vh-12rem)] w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
