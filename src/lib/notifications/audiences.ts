/**
 * Audience scope codes stored on notification_event_types.audience_scopes and edited on company rules.
 * Dispatch code should expand recipients to match these intents; labels are for the settings UI.
 */
export const NOTIFICATION_AUDIENCE_SCOPES = [
  "assigned_user",
  "assigned_crew_members",
  "requestor",
  "dispatch_roles",
  "managers",
  "admins",
  "company_wide",
  "watchers",
  "inventory_roles",
] as const;

export type NotificationAudienceScope = (typeof NOTIFICATION_AUDIENCE_SCOPES)[number];

export const AUDIENCE_SCOPE_LABELS: Record<string, string> = {
  assigned_user: "Assigned technician (linked user)",
  assigned_crew_members: "Crew members (linked users)",
  requestor: "Requestor / portal submitter",
  dispatch_roles: "Dispatchers (owner, admin, member)",
  managers: "Managers (owner, admin)",
  admins: "Admins (owner, admin)",
  company_wide: "Company-wide (all tenant members with access)",
  watchers: "Watchers / followers (when supported)",
  inventory_roles: "Inventory leads (owner, admin with inventory)",
};

/** Human-readable list for table column. */
export function formatAudienceScopes(scopes: string[] | null | undefined): string {
  if (!scopes?.length) return "—";
  return scopes.map((s) => AUDIENCE_SCOPE_LABELS[s] ?? s).join(" · ");
}
