import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";

export default async function SettingsNotificationsPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/dashboard");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("channel, category, enabled")
    .eq("user_id", ctx.effectiveUserId)
    .order("channel");

  const rows = (prefs ?? []) as Array<{ channel: string; category: string; enabled: boolean }>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Notification preferences
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Manage how you receive notifications. Tenant-wide defaults can be configured by admins.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No preferences set; defaults apply.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {rows.map((p, i) => (
              <li key={`${p.channel}-${p.category}-${i}`} className="flex items-center justify-between py-2 first:pt-0">
                <span className="text-sm text-[var(--foreground)]">
                  {p.channel} · {p.category}
                </span>
                <span
                  className={
                    p.enabled
                      ? "text-xs text-green-600 dark:text-green-400"
                      : "text-xs text-[var(--muted)]"
                  }
                >
                  {p.enabled ? "On" : "Off"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
