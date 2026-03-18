"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type DemoScenarioContext = {
  request: { id: string; title: string };
  workOrder: { id: string; title: string; status: string; assignedTechnicianId: string | null; dispatchDate: string };
  technician: { id: string; name: string };
  completedWorkOrder: { id: string; title: string };
};

type ScenarioLookup = {
  requestTitles: string[];
  technicianNames: string[];
  workOrderTitles: { requestTitle: string; dispatchTitle: string; completedTitle: string }[];
};

const SCENARIO_LOOKUP: ScenarioLookup = {
  requestTitles: [
    "HVAC not cooling – Building A",
    "Water leak – Room 204",
    "Lights out – Gym",
  ],
  technicianNames: ["Mike Johnson", "Sarah Chen", "Luis Martinez"],
  workOrderTitles: [
    {
      // Step 2 -> Step 3
      requestTitle: "HVAC not cooling – Building A",
      dispatchTitle: "HVAC not cooling – Building A",
      // Step 6
      completedTitle: "Lights out – Gym",
    },
  ],
};

function pickFirst<T>(items: T[] | null | undefined, fallback: T): T {
  return (items ?? []).length ? (items as T[])[0] : fallback;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

async function findTechnicianByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyIds: string[],
  names: string[]
) {
  // Technicians are scoped via `company_id` (not `tenant_id`).
  // We select by matching technician_name first, then fallback to name.
  for (const raw of names) {
    const n = normalizeWhitespace(raw);
    const { data: byTechnicianName } = await supabase
      .from("technicians")
      .select("id, technician_name, name")
      .eq("status", "active")
      .eq("technician_name", n)
      .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(1)
      .maybeSingle();

    if (byTechnicianName?.id) {
      return {
        id: byTechnicianName.id as string,
        name:
          (byTechnicianName as { technician_name?: string; name?: string }).technician_name ??
          (byTechnicianName as { technician_name?: string; name?: string }).name ??
          n,
      };
    }

    const { data: byName } = await supabase
      .from("technicians")
      .select("id, technician_name, name")
      .eq("status", "active")
      .eq("name", n)
      .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(1)
      .maybeSingle();

    if (byName?.id) {
      return {
        id: byName.id as string,
        name:
          (byName as { technician_name?: string; name?: string }).technician_name ??
          (byName as { technician_name?: string; name?: string }).name ??
          n,
      };
    }
  }

  const { data } = await supabase
    .from("technicians")
    .select("id, technician_name, name")
    .eq("status", "active")
    .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
    .order("technician_name")
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    return {
      id: data.id as string,
      name:
        (data as { technician_name?: string; name?: string }).technician_name ??
        (data as { technician_name?: string; name?: string }).name ??
        "Technician",
    };
  }

  return { id: "00000000-0000-0000-0000-000000000000", name: "Technician" };
}

export async function getDemoScenarioContextAction(): Promise<{ error?: string; ctx?: DemoScenarioContext }> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);

  const requestTitles = SCENARIO_LOOKUP.workOrderTitles[0]
    ? [SCENARIO_LOOKUP.workOrderTitles[0].requestTitle, ...SCENARIO_LOOKUP.requestTitles]
    : SCENARIO_LOOKUP.requestTitles;

  const firstRequestTitle = requestTitles[0];

  // Step 2 anchor: request row by description.
  const { data: requestRow } = await supabase
    .from("work_requests")
    .select("id, description")
    .eq("tenant_id", tenantId)
    .in("description", requestTitles.slice(0, 3))
    .limit(1)
    .maybeSingle();

  // Fallback: first request.
  const resolvedRequestRow =
    requestRow ??
    (await supabase
      .from("work_requests")
      .select("id, description")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle());

  if (!resolvedRequestRow?.id) {
    return { error: "No demo requests found." };
  }

  const requestId = resolvedRequestRow.id as string;
  const requestTitle = (resolvedRequestRow.description as string) ?? firstRequestTitle ?? "Work request";

  // Step 3 anchor: linked work order (preferred) or matching title.
  const { data: linkedWo } = await supabase
    .from("work_orders")
    .select("id, title, status, assigned_technician_id, scheduled_date")
    .eq("tenant_id", tenantId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const desiredWoTitle = SCENARIO_LOOKUP.workOrderTitles[0]?.dispatchTitle ?? requestTitle;
  const { data: matchedWo } = linkedWo
    ? { data: linkedWo }
    : await supabase
        .from("work_orders")
        .select("id, title, status, assigned_technician_id, scheduled_date")
        .eq("tenant_id", tenantId)
        .eq("title", desiredWoTitle)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const workOrderRow = (matchedWo ?? linkedWo) as
    | { id: string; title: string; status: string; assigned_technician_id: string | null; scheduled_date: string | null }
    | null;

  if (!workOrderRow?.id) {
    return { error: "No linked demo work order found." };
  }

  const workOrderId = workOrderRow.id as string;
  const workOrderTitle = (workOrderRow.title as string) ?? desiredWoTitle ?? "Work order";
  const workOrderStatus = (workOrderRow.status as string) ?? "in_progress";
  const assignedTechnicianId = (workOrderRow.assigned_technician_id as string | null) ?? null;

  const dispatchDate =
    (workOrderRow.scheduled_date as string | null) ??
    new Date().toISOString().slice(0, 10);

  // Step 4/5 technician anchor: use assigned technician if possible, else by name, else first.
  let technician = null as { id: string; name: string } | null;
  if (assignedTechnicianId) {
    const { data } = await supabase
      .from("technicians")
      .select("id, technician_name, name")
      .eq("id", assignedTechnicianId)
      .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      technician = {
        id: data.id as string,
        name:
          (data as { technician_name?: string; name?: string }).technician_name ??
          (data as { technician_name?: string; name?: string }).name ??
          "Technician",
      };
    }
  }

  if (!technician) {
    technician = await findTechnicianByName(supabase, companyIds, SCENARIO_LOOKUP.technicianNames);
  }

  // Step 6 anchor: completed work order.
  const completedTitle = SCENARIO_LOOKUP.workOrderTitles[0]?.completedTitle ?? "Lights out – Gym";
  const { data: completedRow } = await supabase
    .from("work_orders")
    .select("id, title")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .eq("title", completedTitle)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resolvedCompletedRow =
    completedRow ??
    (await supabase
      .from("work_orders")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle());

  if (!resolvedCompletedRow?.id) {
    return { error: "No completed demo work order found." };
  }

  return {
    ctx: {
      request: { id: requestId, title: String(requestTitle) },
      workOrder: {
        id: workOrderId,
        title: String(workOrderTitle),
        status: String(workOrderStatus),
        assignedTechnicianId,
        dispatchDate,
      },
      technician,
      completedWorkOrder: {
        id: resolvedCompletedRow.id as string,
        title: (resolvedCompletedRow.title as string) ?? resolvedCompletedRow.id,
      },
    },
  };
}

