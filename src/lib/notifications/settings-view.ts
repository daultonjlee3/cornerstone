/**
 * Server-side payloads for the layered notification settings UI (company / role / user tabs).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAudienceScopes } from "@/src/lib/notifications/audiences";
import {
  computeAfterCompany,
  computeAfterRole,
  computeNotificationLayersFromState,
  resolvedChannelsFromEventTypeRow,
  type NotificationNullableChannels,
  type ResolvedNotificationChannels,
  type UserEventPreferencePartial,
} from "@/src/lib/notifications/policy";

export type NotificationEventTypeRow = {
  code: string;
  name: string;
  category: string;
  default_in_app: boolean;
  default_email: boolean;
  default_sms: boolean;
  default_push: boolean;
  audience_scopes: string[] | null;
};

export type UiNotificationEvent = {
  code: string;
  name: string;
  category: string;
  audienceLabel: string;
  base: ResolvedNotificationChannels;
};

export type CompanySettingsRow = UiNotificationEvent & {
  companyRule: NotificationNullableChannels | null;
  effective: ResolvedNotificationChannels;
};

export type RoleSettingsRow = UiNotificationEvent & {
  companyRule: NotificationNullableChannels | null;
  roleRule: NotificationNullableChannels | null;
  inherited: ResolvedNotificationChannels;
  effective: ResolvedNotificationChannels;
};

export type UserSettingsRow = UiNotificationEvent & {
  companyRule: NotificationNullableChannels | null;
  roleRule: NotificationNullableChannels | null;
  userRow: UserEventPreferencePartial | null;
  inherited: ResolvedNotificationChannels;
  effective: ResolvedNotificationChannels;
};

export async function fetchNotificationEventTypes(
  supabase: SupabaseClient
): Promise<NotificationEventTypeRow[]> {
  const { data } = await supabase
    .from("notification_event_types")
    .select(
      "code, name, category, default_in_app, default_email, default_sms, default_push, audience_scopes"
    )
    .order("category", { ascending: true })
    .order("code", { ascending: true });
  return (data ?? []) as NotificationEventTypeRow[];
}

function toUiEvent(et: NotificationEventTypeRow): UiNotificationEvent {
  return {
    code: et.code,
    name: et.name,
    category: et.category,
    audienceLabel: formatAudienceScopes(et.audience_scopes),
    base: resolvedChannelsFromEventTypeRow(et),
  };
}

export function buildCompanySettingsRows(
  events: NotificationEventTypeRow[],
  companyRuleByEvent: Map<string, NotificationNullableChannels | null>
): CompanySettingsRow[] {
  return events.map((et) => {
    const ui = toUiEvent(et);
    const companyRule = companyRuleByEvent.get(et.code) ?? null;
    return {
      ...ui,
      companyRule,
      effective: computeAfterCompany(ui.base, companyRule),
    };
  });
}

function pickRoleRule(
  eventType: string,
  scoped: Map<string, NotificationNullableChannels | null>,
  global: Map<string, NotificationNullableChannels | null>
): NotificationNullableChannels | null {
  return scoped.get(eventType) ?? global.get(eventType) ?? null;
}

export function buildRoleSettingsRows(
  events: NotificationEventTypeRow[],
  companyRuleByEvent: Map<string, NotificationNullableChannels | null>,
  roleScopedByEvent: Map<string, NotificationNullableChannels | null>,
  roleGlobalByEvent: Map<string, NotificationNullableChannels | null>
): RoleSettingsRow[] {
  return events.map((et) => {
    const ui = toUiEvent(et);
    const companyRule = companyRuleByEvent.get(et.code) ?? null;
    const afterCompany = computeAfterCompany(ui.base, companyRule);
    const roleRule = pickRoleRule(et.code, roleScopedByEvent, roleGlobalByEvent);
    return {
      ...ui,
      companyRule,
      roleRule,
      inherited: afterCompany,
      effective: computeAfterRole(afterCompany, roleRule),
    };
  });
}

export function buildUserSettingsRows(
  events: NotificationEventTypeRow[],
  companyRuleByEvent: Map<string, NotificationNullableChannels | null>,
  roleScopedByEvent: Map<string, NotificationNullableChannels | null>,
  roleGlobalByEvent: Map<string, NotificationNullableChannels | null>,
  userPrefByEvent: Map<string, UserEventPreferencePartial | null>
): UserSettingsRow[] {
  return events.map((et) => {
    const ui = toUiEvent(et);
    const companyRule = companyRuleByEvent.get(et.code) ?? null;
    const roleRule = pickRoleRule(et.code, roleScopedByEvent, roleGlobalByEvent);
    const userRow = userPrefByEvent.get(et.code) ?? null;
    const { effective, inherited } = computeNotificationLayersFromState({
      eventDefaults: ui.base,
      companyRule,
      roleRule,
      userRow,
    });
    return {
      ...ui,
      companyRule,
      roleRule,
      userRow,
      inherited,
      effective,
    };
  });
}

export async function loadCompanyRuleMap(
  supabase: SupabaseClient,
  companyId: string
): Promise<Map<string, NotificationNullableChannels | null>> {
  const { data } = await supabase
    .from("notification_company_rules")
    .select("event_type, enabled, in_app, email, sms, push")
    .eq("company_id", companyId);
  const m = new Map<string, NotificationNullableChannels | null>();
  for (const raw of data ?? []) {
    const r = raw as {
      event_type: string;
      enabled: boolean | null;
      in_app: boolean | null;
      email: boolean | null;
      sms: boolean | null;
      push: boolean | null;
    };
    m.set(r.event_type, {
      enabled: r.enabled,
      in_app: r.in_app,
      email: r.email,
      sms: r.sms,
      push: r.push,
    });
  }
  return m;
}

export async function loadRoleRuleMaps(
  supabase: SupabaseClient,
  tenantId: string,
  role: string,
  scopeCompanyId: string | null
): Promise<{
  global: Map<string, NotificationNullableChannels | null>;
  scoped: Map<string, NotificationNullableChannels | null>;
}> {
  const { data: globalRows } = await supabase
    .from("notification_rules")
    .select("event_type, enabled, in_app, email, sms, push")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .is("company_id", null);
  const global = new Map<string, NotificationNullableChannels | null>();
  for (const r of (globalRows ?? []) as Array<
    NotificationNullableChannels & { event_type: string }
  >) {
    global.set(r.event_type, {
      enabled: r.enabled,
      in_app: r.in_app,
      email: r.email,
      sms: r.sms,
      push: r.push,
    });
  }
  const scoped = new Map<string, NotificationNullableChannels | null>();
  if (scopeCompanyId) {
    const { data: scopedRows } = await supabase
      .from("notification_rules")
      .select("event_type, enabled, in_app, email, sms, push")
      .eq("tenant_id", tenantId)
      .eq("role", role)
      .eq("company_id", scopeCompanyId);
    for (const r of (scopedRows ?? []) as Array<
      NotificationNullableChannels & { event_type: string }
    >) {
      scoped.set(r.event_type, {
        enabled: r.enabled,
        in_app: r.in_app,
        email: r.email,
        sms: r.sms,
        push: r.push,
      });
    }
  }
  return { global, scoped };
}

export async function loadUserPrefMap(
  supabase: SupabaseClient,
  userId: string
): Promise<Map<string, UserEventPreferencePartial | null>> {
  const { data } = await supabase
    .from("notification_user_event_preferences")
    .select("event_type, in_app, email, sms, push")
    .eq("user_id", userId);
  const m = new Map<string, UserEventPreferencePartial | null>();
  for (const r of (data ?? []) as Array<
    UserEventPreferencePartial & { event_type: string }
  >) {
    m.set(r.event_type, {
      in_app: r.in_app,
      email: r.email,
      sms: r.sms,
      push: r.push,
    });
  }
  return m;
}
