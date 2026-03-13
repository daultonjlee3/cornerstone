import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const IMPERSONATION_COOKIE = "cs_impersonation";

export type ImpersonationSession = {
  admin_user_id: string;
  technician_user_id: string;
  technician_id: string;
  company_id: string;
  technician_name: string;
  started_at: string;
};

export type PortalAccessContext = {
  userId: string;
  tenantId: string;
  membershipRole: string;
  isAdmin: boolean;
  isPortalOnlyUser: boolean;
  technicianId: string | null;
  technicianName: string | null;
  technicianCompanyId: string | null;
  crewIds: string[];
  impersonation: ImpersonationSession | null;
  actingAsTechnician: boolean;
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

function parseImpersonationCookie(rawValue: string | null | undefined): ImpersonationSession | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<ImpersonationSession>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.admin_user_id ||
      !parsed.technician_user_id ||
      !parsed.technician_id ||
      !parsed.company_id ||
      !parsed.started_at
    ) {
      return null;
    }
    return {
      admin_user_id: parsed.admin_user_id,
      technician_user_id: parsed.technician_user_id,
      technician_id: parsed.technician_id,
      company_id: parsed.company_id,
      technician_name: parsed.technician_name ?? "Technician",
      started_at: parsed.started_at,
    };
  } catch {
    return null;
  }
}

export async function getImpersonationSession(): Promise<ImpersonationSession | null> {
  const store = await cookies();
  return parseImpersonationCookie(store.get(IMPERSONATION_COOKIE)?.value ?? null);
}

export async function resolvePortalAccessContext(
  supabase: SupabaseClient
): Promise<PortalAccessContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membershipRows } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id);
  const firstMembership = (membershipRows ?? [])[0] as
    | { tenant_id: string; role?: string }
    | undefined;
  if (!firstMembership?.tenant_id) return null;

  const membershipRole =
    (firstMembership.role as string | null | undefined) ?? "member";
  const isAdmin =
    isAdminRole(membershipRole) ||
    (membershipRows ?? []).some((m) =>
      isAdminRole((m as { role?: string }).role)
    );
  const impersonationCookie = await getImpersonationSession();
  const impersonation =
    isAdmin && impersonationCookie?.admin_user_id === user.id ? impersonationCookie : null;

  const targetUserId = impersonation?.technician_user_id ?? user.id;
  const { data: targetUserRow } = await supabase
    .from("users")
    .select("id, is_portal_only")
    .eq("id", targetUserId)
    .limit(1)
    .maybeSingle();
  const isPortalOnlyUser =
    Boolean((targetUserRow as { is_portal_only?: boolean | null } | null)?.is_portal_only) ||
    Boolean(impersonation);

  let technicianQuery = supabase
    .from("technicians")
    .select("id, technician_name, name, company_id, status, user_id")
    .eq("tenant_id", firstMembership.tenant_id)
    .eq("status", "active")
    .eq("user_id", targetUserId)
    .limit(1);

  if (impersonation?.technician_id) {
    technicianQuery = technicianQuery.eq("id", impersonation.technician_id);
  }

  const { data: technician } = await technicianQuery.maybeSingle();
  const technicianId = (technician as { id?: string } | null)?.id ?? null;
  const technicianName =
    (technician as { technician_name?: string | null; name?: string | null } | null)
      ?.technician_name ??
    (technician as { technician_name?: string | null; name?: string | null } | null)?.name ??
    (impersonation?.technician_name ?? null);
  const technicianCompanyId =
    (technician as { company_id?: string | null } | null)?.company_id ?? impersonation?.company_id ?? null;

  const { data: crewRows } = technicianId
    ? await supabase.from("crew_members").select("crew_id").eq("technician_id", technicianId)
    : { data: [] as unknown[] };
  const crewIds = ((crewRows ?? []) as Array<{ crew_id?: string | null }>)
    .map((row) => row.crew_id)
    .filter((value): value is string => Boolean(value));

  return {
    userId: user.id,
    tenantId: firstMembership.tenant_id,
    membershipRole,
    isAdmin,
    isPortalOnlyUser,
    technicianId,
    technicianName,
    technicianCompanyId,
    crewIds,
    impersonation,
    actingAsTechnician: Boolean(technicianId),
  };
}
