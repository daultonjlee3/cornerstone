"use client";

import { useState, useTransition } from "react";
import { setPreference } from "./actions";
import { CHANNELS, CATEGORY_LABELS } from "./config";

const CATEGORIES = [
  "work_orders",
  "assignments",
  "overdue",
  "completions",
  "pm",
  "purchase_orders",
  "inventory",
  "portal_requests",
] as const;

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In-app",
  email: "Email",
  sms: "SMS",
};

type PrefsMap = Record<string, boolean>;

export function NotificationPreferencesForm({
  initialPrefs,
}: {
  initialPrefs: PrefsMap;
}) {
  const [prefs, setPrefs] = useState<PrefsMap>(() => ({ ...initialPrefs }));
  const [isPending, startTransition] = useTransition();

  function handleToggle(channel: string, category: string, enabled: boolean) {
    const key = `${channel}:${category}`;
    setPrefs((prev) => ({ ...prev, [key]: enabled }));
    startTransition(async () => {
      await setPreference(
        channel as "in_app" | "email" | "sms",
        category,
        enabled
      );
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)]">
            <th className="pb-2 pr-4 text-left font-medium text-[var(--muted)]">
              Category
            </th>
            {CHANNELS.map((ch) => (
              <th
                key={ch}
                className="pb-2 px-2 text-center font-medium text-[var(--muted)]"
              >
                {CHANNEL_LABELS[ch]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => (
            <tr
              key={category}
              className="border-b border-[var(--card-border)] last:border-0"
            >
              <td className="py-3 pr-4 text-[var(--foreground)]">
                {CATEGORY_LABELS[category] ?? category}
              </td>
              {CHANNELS.map((channel) => {
                const key = `${channel}:${category}`;
                const enabled = prefs[key] ?? true;
                return (
                  <td key={channel} className="py-3 px-2 text-center">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={isPending}
                        onChange={(e) =>
                          handleToggle(channel, category, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-[var(--card-border)]"
                      />
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {isPending && (
        <p className="mt-2 text-xs text-[var(--muted)]">Saving…</p>
      )}
    </div>
  );
}
