import { Suspense } from "react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";
import { ensureDefaultPreferences } from "@/src/lib/notifications/service";
import {
  buildCompanySettingsRows,
  buildRoleSettingsRows,
  buildUserSettingsRows,
  fetchNotificationEventTypes,
  loadCompanyRuleMap,
  loadRoleRuleMaps,
  loadUserPrefMap,
} from "@/src/lib/notifications/settings-view";
import { NotificationSettingsClient } from "./notification-settings-client";

const EDITOR_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
  "technician",
  "demo_guest",
] as const;

type Tab = "company" | "role" | "user";

export default async function SettingsNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    tab?: string;
    rrole?: string;
    rscope?: string;
  }>;
}) {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/operations");

  await ensureDefaultPreferences(supabase, ctx.effectiveUserId);

  const canManagePolicy =
    ctx.isPlatformSuperAdmin ||
    ctx.membershipRole === "owner" ||
    ctx.membershipRole === "admin";

  const sp = await searchParams;

  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .order("name");
  const companies = (companyRows ?? []) as Array<{ id: string; name: string }>;
  const companyId =
    sp.company && companies.some((c) => c.id === sp.company)
      ? sp.company
      : ctx.defaultCompanyId ?? companies[0]?.id ?? "";

  if (!companyId) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        Add a company before configuring notification defaults.
      </div>
    );
  }

  const events = await fetchNotificationEventTypes(supabase);
  const companyRuleByEvent = await loadCompanyRuleMap(supabase, companyId);

  const editorRole =
    sp.rrole && EDITOR_ROLES.includes(sp.rrole as (typeof EDITOR_ROLES)[number])
      ? sp.rrole
      : "member";

  const editorScopeCompanyId =
    sp.rscope &&
    sp.rscope !== "tenant" &&
    companies.some((c) => c.id === sp.rscope)
      ? sp.rscope
      : null;

  const { global: roleGlobalByEvent, scoped: roleScopedByEvent } =
    await loadRoleRuleMaps(supabase, ctx.tenantId, editorRole, editorScopeCompanyId);

  const userPrefByEvent = await loadUserPrefMap(supabase, ctx.effectiveUserId);

  const membershipRole = ctx.membershipRole ?? "member";
  const { global: userRoleGlobal, scoped: userRoleScoped } =
    await loadRoleRuleMaps(supabase, ctx.tenantId, membershipRole, companyId);

  const companySettingsRows = buildCompanySettingsRows(events, companyRuleByEvent);
  const roleSettingsRows = buildRoleSettingsRows(
    events,
    companyRuleByEvent,
    roleScopedByEvent,
    roleGlobalByEvent
  );
  const userSettingsRows = buildUserSettingsRows(
    events,
    companyRuleByEvent,
    userRoleScoped,
    userRoleGlobal,
    userPrefByEvent
  );

  let activeTab: Tab = canManagePolicy ? "company" : "user";
  if (canManagePolicy && (sp.tab === "company" || sp.tab === "role" || sp.tab === "user")) {
    activeTab = sp.tab;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Notifications
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Each channel is resolved per event: <strong>your preference</strong>{" "}
          overrides <strong>role</strong> (company-specific or tenant-wide),
          which overrides <strong>company</strong>, which overrides{" "}
          <strong>system defaults</strong>. Dispatch targets recipients by event
          (for example assigned technician, crew, and dispatch roles for
          assignments)—preferences do not subscribe you to unrelated records.
        </p>
        <Suspense
          fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
        >
          <NotificationSettingsClient
            companyId={companyId}
            companies={companies}
            canManagePolicy={canManagePolicy}
            companyRows={companySettingsRows}
            roleRows={roleSettingsRows}
            userRows={userSettingsRows}
            editorRole={editorRole}
            editorScopeCompanyId={editorScopeCompanyId}
            activeTab={activeTab}
          />
        </Suspense>
      </section>
    </div>
  );
}
