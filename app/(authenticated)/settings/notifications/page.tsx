import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";
import { ensureDefaultPreferences } from "@/src/lib/notifications/service";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export default async function SettingsNotificationsPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/operations");

  await ensureDefaultPreferences(supabase, ctx.effectiveUserId);

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("channel, category, enabled")
    .eq("user_id", ctx.effectiveUserId)
    .order("channel");

  const rows = (prefs ?? []) as Array<{
    channel: string;
    category: string;
    enabled: boolean;
  }>;

  const initialPrefs: Record<string, boolean> = {};
  for (const p of rows) {
    initialPrefs[`${p.channel}:${p.category}`] = p.enabled;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Notification preferences
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Override how you receive notifications by category. Role defaults are
          set by admins; unset toggles use those defaults.
        </p>
        <NotificationPreferencesForm initialPrefs={initialPrefs} />
      </section>
    </div>
  );
}
