"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import type { NotificationChannel } from "@/src/lib/notifications/types";
import type {
  NotificationNullableChannels,
  ResolvedNotificationChannels,
  UserEventPreferencePartial,
} from "@/src/lib/notifications/policy";
import { CATEGORY_LABELS, SETTINGS_CHANNELS } from "./config";
import type {
  CompanySettingsRow,
  RoleSettingsRow,
  UserSettingsRow,
} from "@/src/lib/notifications/settings-view";
import {
  upsertCompanyNotificationRule,
  upsertRoleNotificationRule,
  setUserEventNotificationChannel,
  type ChannelTriState,
} from "./actions";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
  { value: "technician", label: "Technician" },
  { value: "demo_guest", label: "Demo guest" },
] as const;

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  email: "Email",
  sms: "SMS",
  push: "Push (planned)",
};

function boolToTri(v: boolean | null | undefined): ChannelTriState {
  if (v === true) return "on";
  if (v === false) return "off";
  return "inherit";
}

function triLabel(on: boolean): string {
  return on ? "On" : "Off";
}

function triForChannel(
  rule: NotificationNullableChannels | null | undefined,
  key: keyof NotificationNullableChannels
): ChannelTriState {
  if (!rule || key === "enabled") return "inherit";
  return boolToTri(rule[key] as boolean | null);
}

function triForEnabled(rule: NotificationNullableChannels | null | undefined): ChannelTriState {
  return boolToTri(rule?.enabled);
}

function companyPatch(
  row: CompanySettingsRow,
  field: "enabled" | NotificationChannel,
  tri: ChannelTriState
) {
  const r = row.companyRule;
  return {
    enabled: field === "enabled" ? tri : triForEnabled(r),
    in_app: field === "in_app" ? tri : triForChannel(r, "in_app"),
    email: field === "email" ? tri : triForChannel(r, "email"),
    sms: field === "sms" ? tri : triForChannel(r, "sms"),
    push: field === "push" ? tri : triForChannel(r, "push"),
  };
}

function rolePatch(
  row: RoleSettingsRow,
  field: "enabled" | NotificationChannel,
  tri: ChannelTriState
) {
  const r = row.roleRule;
  return {
    enabled: field === "enabled" ? tri : triForEnabled(r),
    in_app: field === "in_app" ? tri : triForChannel(r, "in_app"),
    email: field === "email" ? tri : triForChannel(r, "email"),
    sms: field === "sms" ? tri : triForChannel(r, "sms"),
    push: field === "push" ? tri : triForChannel(r, "push"),
  };
}

function triUser(
  userRow: UserEventPreferencePartial | null | undefined,
  ch: NotificationChannel
): ChannelTriState {
  if (!userRow) return "inherit";
  return boolToTri(userRow[ch]);
}

function TriSelect({
  value,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: ChannelTriState;
  disabled?: boolean;
  onChange: (t: ChannelTriState) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value as ChannelTriState)}
      className="max-w-[7.5rem] rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]"
    >
      <option value="inherit">Inherit</option>
      <option value="on">On</option>
      <option value="off">Off</option>
    </select>
  );
}

function chVal(c: ResolvedNotificationChannels, k: NotificationChannel): boolean {
  return c[k];
}

type Tab = "company" | "role" | "user";

export function NotificationSettingsClient({
  companyId,
  companies,
  canManagePolicy,
  companyRows,
  roleRows,
  userRows,
  editorRole,
  editorScopeCompanyId,
  activeTab,
}: {
  companyId: string;
  companies: { id: string; name: string }[];
  canManagePolicy: boolean;
  companyRows: CompanySettingsRow[];
  roleRows: RoleSettingsRow[];
  userRows: UserSettingsRow[];
  editorRole: string;
  editorScopeCompanyId: string | null;
  activeTab: Tab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function hrefFor(partial: Record<string, string | undefined>) {
    const q = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    return `/settings/notifications?${q.toString()}`;
  }

  function runSave(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (r.error) {
        // eslint-disable-next-line no-alert
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  const tabs: { id: Tab; label: string }[] = canManagePolicy
    ? [
        { id: "company", label: "Company defaults" },
        { id: "role", label: "Role defaults" },
        { id: "user", label: "My preferences" },
      ]
    : [{ id: "user", label: "My preferences" }];

  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  function rowsByCategory<T extends { category: string }>(rows: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const r of rows) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <span>Company context</span>
          <select
            value={companyId}
            disabled={pending}
            onChange={(e) => {
              router.push(hrefFor({ company: e.target.value }));
            }}
            className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={hrefFor({ tab: t.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--card)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "role" && canManagePolicy && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-[var(--muted)]">
            Role
            <select
              value={editorRole}
              disabled={pending}
              onChange={(e) => router.push(hrefFor({ rrole: e.target.value }))}
              className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-[var(--foreground)]"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[var(--muted)]">
            Scope
            <select
              value={editorScopeCompanyId ?? "tenant"}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                router.push(
                  hrefFor({ rscope: v === "tenant" ? "tenant" : v })
                );
              }}
              className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-[var(--foreground)]"
            >
              <option value="tenant">Tenant-wide</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} only
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        {tab === "company" &&
          "Company rules layer on system defaults. Use Inherit to follow the registry default."}
        {tab === "role" &&
          "Role rules inherit from company policy (shown as baseline). Per-company role rows override tenant-wide role rows."}
        {tab === "user" &&
          "Your choices inherit from role defaults unless you override a channel. Inherit shows the effective value in lighter text."}
      </p>

      {tab === "company" && canManagePolicy && (
        <PolicyTable<CompanySettingsRow>
          groups={rowsByCategory(companyRows)}
          showInherited={false}
          showEnabled
          renderRow={(row) => (
            <>
              <td className="py-2 pr-3 align-top">
                <div className="font-medium text-[var(--foreground)]">{row.name}</div>
                <code className="text-[10px] text-[var(--muted)]">{row.code}</code>
              </td>
              <td className="py-2 pr-3 align-top text-xs text-[var(--muted)]">
                {row.audienceLabel}
              </td>
              <td className="py-2 px-1 align-top">
                <TriSelect
                  ariaLabel={`${row.code} event enabled`}
                  disabled={pending}
                  value={triForEnabled(row.companyRule)}
                  onChange={(tri) =>
                    runSave(() =>
                      upsertCompanyNotificationRule(companyId, row.code, companyPatch(row, "enabled", tri))
                    )
                  }
                />
              </td>
              {SETTINGS_CHANNELS.map((ch) => (
                <td key={ch} className="py-2 px-1 align-top">
                  <TriSelect
                    ariaLabel={`${row.code} ${ch}`}
                    disabled={pending}
                    value={triForChannel(row.companyRule, ch)}
                    onChange={(tri) =>
                      runSave(() =>
                        upsertCompanyNotificationRule(companyId, row.code, companyPatch(row, ch, tri))
                      )
                    }
                  />
                  <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                    Effective: {triLabel(chVal(row.effective, ch))}
                  </div>
                </td>
              ))}
            </>
          )}
        />
      )}

      {tab === "role" && canManagePolicy && (
        <PolicyTable<RoleSettingsRow>
          groups={rowsByCategory(roleRows)}
          showInherited
          showEnabled
          renderRow={(row) => (
            <>
              <td className="py-2 pr-3 align-top">
                <div className="font-medium text-[var(--foreground)]">{row.name}</div>
                <code className="text-[10px] text-[var(--muted)]">{row.code}</code>
              </td>
              <td className="py-2 pr-3 align-top text-xs text-[var(--muted)]">
                {row.audienceLabel}
              </td>
              <td className="py-2 pr-3 align-top text-[10px] text-[var(--muted)]">
                {SETTINGS_CHANNELS.map((ch) => (
                  <div key={ch}>
                    {CHANNEL_LABELS[ch]}: {triLabel(chVal(row.inherited, ch))}
                  </div>
                ))}
              </td>
              <td className="py-2 px-1 align-top">
                <TriSelect
                  ariaLabel={`${row.code} role event enabled`}
                  disabled={pending}
                  value={triForEnabled(row.roleRule)}
                  onChange={(tri) =>
                    runSave(() =>
                      upsertRoleNotificationRule(
                        editorRole,
                        row.code,
                        editorScopeCompanyId,
                        rolePatch(row, "enabled", tri)
                      )
                    )
                  }
                />
              </td>
              {SETTINGS_CHANNELS.map((ch) => (
                <td key={ch} className="py-2 px-1 align-top">
                  <TriSelect
                    ariaLabel={`${row.code} role ${ch}`}
                    disabled={pending}
                    value={triForChannel(row.roleRule, ch)}
                    onChange={(tri) =>
                      runSave(() =>
                        upsertRoleNotificationRule(
                          editorRole,
                          row.code,
                          editorScopeCompanyId,
                          rolePatch(row, ch, tri)
                        )
                      )
                    }
                  />
                  <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                    Effective: {triLabel(chVal(row.effective, ch))}
                  </div>
                </td>
              ))}
            </>
          )}
        />
      )}

      {tab === "user" && (
        <PolicyTable<UserSettingsRow>
          groups={rowsByCategory(userRows)}
          showInherited={false}
          showEnabled={false}
          renderRow={(row) => (
            <>
              <td className="py-2 pr-3 align-top">
                <div className="font-medium text-[var(--foreground)]">{row.name}</div>
                <code className="text-[10px] text-[var(--muted)]">{row.code}</code>
              </td>
              <td className="py-2 pr-3 align-top text-xs text-[var(--muted)]">
                {row.audienceLabel}
              </td>
              {SETTINGS_CHANNELS.map((ch) => (
                <td key={ch} className="py-2 px-1 align-top">
                  <TriSelect
                    ariaLabel={`${row.code} my ${ch}`}
                    disabled={pending}
                    value={triUser(row.userRow, ch)}
                    onChange={(tri) =>
                      runSave(() => setUserEventNotificationChannel(row.code, ch, tri))
                    }
                  />
                  <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {triUser(row.userRow, ch) === "inherit"
                      ? `Inherited: ${triLabel(chVal(row.inherited, ch))}`
                      : `Effective: ${triLabel(chVal(row.effective, ch))}`}
                  </div>
                </td>
              ))}
            </>
          )}
        />
      )}

      {pending && <p className="text-xs text-[var(--muted)]">Saving…</p>}
    </div>
  );
}

function PolicyTable<T extends { category: string; code: string }>({
  groups,
  showInherited,
  showEnabled,
  renderRow,
}: {
  groups: Map<string, T[]>;
  showInherited: boolean;
  showEnabled: boolean;
  renderRow: (row: T) => ReactNode;
}) {
  const colSpan =
    2 + (showInherited ? 1 : 0) + (showEnabled ? 1 : 0) + SETTINGS_CHANNELS.length;
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
            <th className="py-2 pr-3 text-left text-xs font-medium text-[var(--muted)]">
              Event
            </th>
            <th className="py-2 pr-3 text-left text-xs font-medium text-[var(--muted)]">
              Audience / scope
            </th>
            {showInherited && (
              <th className="py-2 pr-3 text-left text-xs font-medium text-[var(--muted)]">
                From company
              </th>
            )}
            {showEnabled && (
              <th className="py-2 px-1 text-left text-xs font-medium text-[var(--muted)]">
                Event on
              </th>
            )}
            {SETTINGS_CHANNELS.map((ch) => (
              <th
                key={ch}
                className="py-2 px-1 text-center text-xs font-medium text-[var(--muted)]"
              >
                {CHANNEL_LABELS[ch]}
              </th>
            ))}
          </tr>
        </thead>
        {[...groups.entries()].map(([cat, list]) => (
          <tbody key={cat}>
            <tr className="bg-[var(--card)]">
              <td
                colSpan={colSpan}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </td>
            </tr>
            {list.map((row) => (
              <tr
                key={row.code}
                className="border-b border-[var(--card-border)] last:border-0"
              >
                {renderRow(row)}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
