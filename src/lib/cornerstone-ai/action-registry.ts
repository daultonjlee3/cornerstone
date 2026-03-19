import type { SupabaseClient } from "@supabase/supabase-js";
import { saveWorkOrder, updateWorkOrderAssignment } from "@/app/(authenticated)/work-orders/actions";
import type {
  AiActionType,
  AssignWorkOrdersActionExecuteSpec,
  AssignWorkOrdersActionPreview,
  CreateWorkOrderActionExecuteSpec,
  CreateWorkOrderActionPreview,
  CornerstoneAiResponse,
  CornerstoneAiContext,
} from "./types";

import { revalidatePath } from "next/cache";

export type ActionExecutionResult = {
  ok: true;
  response: CornerstoneAiResponse;
} | { ok: false; response: CornerstoneAiResponse };

export type ActionPreviewResult =
  | {
      preview: AssignWorkOrdersActionPreview | CreateWorkOrderActionPreview;
      executeSpec: AssignWorkOrdersActionExecuteSpec | CreateWorkOrderActionExecuteSpec;
      requiresConfirmation: boolean;
      requiresExecuteIntent: true;
    }
  | {
      preview: AssignWorkOrdersActionPreview | CreateWorkOrderActionPreview;
      requiresConfirmation: boolean;
      requiresExecuteIntent: false;
    };

export type ActionPlan = {
  actionType: AiActionType;
  confidence: number;
  parameters: Record<string, unknown>;
};

export type CornerstoneAiActionDefinition = {
  name: AiActionType;
  description: string;
  requiresConfirmation: boolean;
  requiredInputs: string[];
  preview: (args: {
    supabase: SupabaseClient;
    companyIds: string[];
    context: CornerstoneAiContext;
    parameters: Record<string, unknown>;
  }) => Promise<{ preview: AssignWorkOrdersActionPreview | CreateWorkOrderActionPreview; executeSpec: any }>;
  execute: (args: {
    supabase: SupabaseClient;
    tenantId: string;
    userId?: string | null;
    companyIds: string[];
    executeSpec: any;
  }) => Promise<CornerstoneAiResponse>;
};

export const CornerstoneAiActionRegistry: Record<AiActionType, CornerstoneAiActionDefinition> = {
  assign_work_orders: {
    name: "assign_work_orders",
    description: "Assign unassigned or overdue work orders to a technician (bulk).",
    requiresConfirmation: true,
    requiredInputs: ["filter", "technicianId?"],
    preview: async ({ supabase, companyIds, context, parameters }) =>
      previewAssignWorkOrders({
        supabase,
        context,
        companyIds,
        parameters: parameters as AssignWorkOrdersParameters,
      }),
    execute: async ({ supabase, tenantId, userId, companyIds, executeSpec }) =>
      executeAssignWorkOrders({ supabase, tenantId, userId, companyIds, executeSpec }),
  },
  create_work_order: {
    name: "create_work_order",
    description: "Create a new work order from a natural language request.",
    requiresConfirmation: true,
    requiredInputs: ["title", "companyId (derived)"],
    preview: async ({ supabase: _supabase, context, parameters }) =>
      previewCreateWorkOrder({
        context,
        parameters: parameters as CreateWorkOrderParameters,
      }),
    execute: async ({ supabase, tenantId, userId, companyIds, executeSpec }) =>
      executeCreateWorkOrder({ supabase, tenantId, userId, companyIds, executeSpec }),
  },
  summarize_operations: {
    name: "summarize_operations",
    description: "Return key insights about the current operations state (read-only).",
    requiresConfirmation: false,
    requiredInputs: [],
    preview: async () => {
      return { preview: null as any, executeSpec: null };
    },
    execute: async () => ({
      intent: "ACTION_SUMMARIZE_OPERATIONS",
      answer: "Summary actions don’t require execution.",
      bulletHighlights: [],
      sources: [],
      followUpSuggestions: [],
      mode: "LIGHT",
      warnings: [],
    }),
  },
};

export type AssignWorkOrdersParameters = {
  filter?: "unassigned" | "overdue" | "urgent";
  technicianId?: string;
  reassignExisting?: boolean;
  maxRecords?: number;
};

export type CreateWorkOrderParameters = {
  companyId?: string;
  title?: string;
  description?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  priority?: "low" | "medium" | "high" | "urgent" | "emergency" | null;
  category?: "repair" | "preventive_maintenance" | "inspection" | "installation" | "emergency" | "general" | null;
  assetId?: string | null;
};

const MAX_BULK_ASSIGN = 20;
const PRIORITY_ALLOWED = ["low", "medium", "high", "urgent", "emergency"] as const;
const CATEGORY_ALLOWED = [
  "repair",
  "preventive_maintenance",
  "inspection",
  "installation",
  "emergency",
  "general",
] as const;

function clampMaxRecords(n: unknown): number {
  const num = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (!Number.isFinite(num)) return 20;
  return Math.max(1, Math.min(MAX_BULK_ASSIGN, Math.floor(num)));
}

function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === "completed" || s === "cancelled" || s === "cancelled";
}

function computeCurrentlyAssignedTo(w: {
  assigned_technician_id?: string | null;
  assigned_crew_id?: string | null;
  vendor_id?: string | null;
  assigned_to_label?: string | null;
}): string | null {
  if (w.assigned_to_label) return w.assigned_to_label;
  const hasTech = Boolean(w.assigned_technician_id);
  const hasCrew = Boolean(w.assigned_crew_id);
  const hasVendor = Boolean(w.vendor_id);
  if (!hasTech && !hasCrew && !hasVendor) return "Unassigned";
  if (hasTech && !hasCrew && !hasVendor) return "Assigned";
  if (hasCrew && !hasTech && !hasVendor) return "Crew assigned";
  if (hasVendor && !hasTech && !hasCrew) return "Vendor assigned";
  return "Assigned";
}

function resolveRecommendedTechnicianFromContext(params: {
  technicianId?: string;
  technicians?: Array<{ id: string; label: string }>;
  workOrders?: Array<{ assigned_technician_id?: string | null; status?: string | null }>;
}): { id: string; label: string } | null {
  const { technicianId, technicians, workOrders } = params;
  if (technicianId) {
    const found = technicians?.find((t) => t.id === technicianId);
    return found ? { id: found.id, label: found.label } : { id: technicianId, label: technicianId };
  }
  if (!technicians?.length) return null;
  const byTechOpenCount = new Map<string, number>();
  for (const wo of workOrders ?? []) {
    const techId = wo.assigned_technician_id ?? null;
    if (!techId) continue;
    if (isTerminalStatus(wo.status ?? null)) continue;
    byTechOpenCount.set(techId, (byTechOpenCount.get(techId) ?? 0) + 1);
  }
  const sorted = technicians
    .map((t) => ({
      id: t.id,
      label: t.label,
      openCount: byTechOpenCount.get(t.id) ?? 0,
    }))
    .sort((a, b) => (a.openCount !== b.openCount ? a.openCount - b.openCount : a.label.localeCompare(b.label)));
  return { id: sorted[0]?.id ?? "", label: sorted[0]?.label ?? "" };
}

export async function previewAssignWorkOrders(args: {
  supabase: SupabaseClient;
  context: CornerstoneAiContext;
  companyIds: string[];
  parameters: AssignWorkOrdersParameters;
}): Promise<{
  requiresConfirmation: boolean;
  preview: AssignWorkOrdersActionPreview;
  executeSpec: AssignWorkOrdersActionExecuteSpec;
}> {
  const { context, parameters } = args;
  const filterRaw = parameters.filter ?? "unassigned";
  const filter: "unassigned" | "overdue" | "urgent" =
    filterRaw === "overdue" || filterRaw === "urgent" || filterRaw === "unassigned" ? filterRaw : "unassigned";
  const reassignExisting = parameters.reassignExisting ?? false;
  const maxRecords = clampMaxRecords(parameters.maxRecords);

  let workOrders = context.actionContext?.workOrders ?? [];
  let technicians = context.actionContext?.technicians ?? [];

  // Fallback: if the UI didn’t provide an in-memory working set, read from DB (still no writes).
  if (workOrders.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await args.supabase
      .from("work_orders")
      .select(
        "id, work_order_number, title, status, priority, due_date, assigned_technician_id, assigned_crew_id, vendor_id"
      )
      .in("company_id", args.companyIds)
      .not("status", "in", "(completed,cancelled)");

    const rows = (data ?? []) as Record<string, unknown>[];
    workOrders = rows.map((r) => ({
      id: r.id as string,
      work_order_number: (r.work_order_number as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      status: (r.status as string | null) ?? null,
      priority: (r.priority as string | null) ?? null,
      due_date: (r.due_date as string | null) ?? null,
      assigned_technician_id: (r.assigned_technician_id as string | null) ?? null,
      assigned_crew_id: (r.assigned_crew_id as string | null) ?? null,
      vendor_id: (r.vendor_id as string | null) ?? null,
      assigned_to_label: null,
      location: null,
    }));

    if (technicians.length === 0) {
      const { data: techRows } = await args.supabase
        .from("technicians")
        .select("id, technician_name, name")
        .in("company_id", args.companyIds)
        .eq("status", "active")
        .limit(100);
      const techData = (techRows ?? []) as Record<string, unknown>[];
      technicians = techData.map((t) => {
        const id = t.id as string;
        const label =
          (t.technician_name as string | null) ?? (t.name as string | null) ?? id;
        return { id, label };
      });
    }

    const technicianById = new Map(technicians.map((t) => [t.id, t.label]));
    workOrders = workOrders.map((w) => {
      const label = w.assigned_technician_id ? technicianById.get(w.assigned_technician_id) ?? null : null;
      return { ...w, assigned_to_label: label };
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const candidates = workOrders.filter((w) => {
    const isUnassigned =
      !w.assigned_technician_id && !w.assigned_crew_id && !w.vendor_id;
    const isOverdue = Boolean(w.due_date && w.due_date < today) && !isTerminalStatus(w.status ?? null);
    const priority = w.priority ? String(w.priority).toLowerCase() : "";
    const isUrgent = (priority === "urgent" || priority === "emergency") && !isTerminalStatus(w.status ?? null);

    // Default safe behavior: only unassigned unless explicitly reassignExisting.
    if (!reassignExisting && filter === "overdue") {
      return isUnassigned && isOverdue;
    }
    if (!reassignExisting && filter === "urgent") {
      return isUnassigned && isUrgent;
    }
    if (filter === "unassigned") return isUnassigned;
    if (filter === "overdue") return isUnassigned || isOverdue;
    if (filter === "urgent") return isUnassigned || isUrgent;
    return false;
  });

  const recommendedTechnician = resolveRecommendedTechnicianFromContext({
    technicianId: parameters.technicianId,
    technicians,
    workOrders,
  });

  if (!recommendedTechnician) {
    // Fallback to a safe placeholder; execution will still fail gracefully.
    return {
      requiresConfirmation: true,
      preview: {
        recommendedTechnician: { id: parameters.technicianId ?? "unknown", label: parameters.technicianId ?? "Unassigned" },
        workOrders: candidates.slice(0, maxRecords).map((w) => ({
          id: w.id,
          work_order_number: w.work_order_number ?? null,
          title: w.title ?? null,
          due_date: w.due_date ?? null,
          currentlyAssignedTo: computeCurrentlyAssignedTo(w),
        })),
      },
      executeSpec: {
        technicianId: parameters.technicianId ?? "",
        workOrderIds: candidates.slice(0, maxRecords).map((w) => w.id),
      },
    };
  }

  const selected = candidates.slice(0, maxRecords);

  return {
    requiresConfirmation: true,
    preview: {
      recommendedTechnician,
      workOrders: selected.map((w) => ({
        id: w.id,
        work_order_number: w.work_order_number ?? null,
        title: w.title ?? null,
        due_date: w.due_date ?? null,
        currentlyAssignedTo: computeCurrentlyAssignedTo(w),
      })),
    },
    executeSpec: {
      technicianId: recommendedTechnician.id,
      workOrderIds: selected.map((w) => w.id),
    },
  };
}

export async function previewCreateWorkOrder(args: {
  parameters: CreateWorkOrderParameters;
  context: CornerstoneAiContext;
}): Promise<{
  requiresConfirmation: boolean;
  preview: CreateWorkOrderActionPreview;
  executeSpec: CreateWorkOrderActionExecuteSpec;
}> {
  const p = args.parameters;

  const title = (p.title ?? "").toString().trim() || "Work order";
  const description = p.description != null ? String(p.description) : null;
  const due_date =
    p.due_date != null && typeof p.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.due_date)
      ? p.due_date
      : null;
  const priority = p.priority && PRIORITY_ALLOWED.includes(p.priority as any) ? p.priority : null;
  const category = p.category && CATEGORY_ALLOWED.includes(p.category as any) ? p.category : null;

  const assetId =
    p.assetId ??
    args.context.entityType === "asset" ? args.context.recordSummary?.asset?.id ?? null : null;

  const companyId = p.companyId ?? (args.context.entityType === "list" ? args.context.listFilters?.company_id : null) ?? "";

  return {
    requiresConfirmation: true,
    preview: {
      companyId: String(companyId || ""),
      title,
      description,
      due_date,
      priority,
      category,
      assetId,
    },
    executeSpec: {
      companyId: String(companyId || ""),
      title,
      description,
      due_date,
      priority,
      category,
      assetId,
    },
  };
}

export type ActionExecuteAssignWorkOrdersSpec = AssignWorkOrdersActionExecuteSpec;
export type ActionExecuteCreateWorkOrderSpec = CreateWorkOrderActionExecuteSpec;

export async function executeAssignWorkOrders(args: {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  companyIds: string[];
  executeSpec: ActionExecuteAssignWorkOrdersSpec;
}): Promise<CornerstoneAiResponse> {
  const ids = Array.from(new Set(args.executeSpec.workOrderIds)).slice(0, MAX_BULK_ASSIGN);
  const technicianId = args.executeSpec.technicianId;
  if (!technicianId || !ids.length) {
    return {
      intent: "ACTION_ASSIGN_WORK_ORDERS",
      answer: "No work orders were selected for assignment.",
      bulletHighlights: [],
      sources: [],
      followUpSuggestions: [],
      mode: "LIGHT",
      warnings: [],
    };
  }

  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    const res = await updateWorkOrderAssignment(id, {
      assigned_technician_id: technicianId,
      assigned_crew_id: null,
      assigned_vendor_id: null,
    });
    if (res.error) fail++;
    else ok++;
  }

  revalidatePath("/work-orders");
  revalidatePath("/dispatch");

  return {
    intent: "ACTION_ASSIGN_WORK_ORDERS",
    answer:
      fail > 0
        ? `Assigned ${ok} work order${ok === 1 ? "" : "s"}. Some could not be updated due to permission or status.`
        : `Assigned ${ok} work order${ok === 1 ? "" : "s"} successfully.`,
    bulletHighlights: [
      `Updated: ${ok}`,
      fail > 0 ? `Skipped/failed: ${fail}` : "",
      `Total targeted: ${ids.length}`,
    ].filter(Boolean),
    sources: [],
    followUpSuggestions: ["Open Work Orders to review.", "Ask Cornerstone what changed."],
    mode: "LIGHT",
    warnings: fail > 0 ? ["Some assignments failed."] : [],
  };
}

export async function executeCreateWorkOrder(args: {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  companyIds: string[];
  executeSpec: ActionExecuteCreateWorkOrderSpec;
}): Promise<CornerstoneAiResponse> {
  const companyId = args.executeSpec.companyId || args.companyIds?.[0];
  if (!companyId) {
    return {
      intent: "ACTION_CREATE_WORK_ORDER",
      answer: "I couldn’t determine which company to create the work order in.",
      bulletHighlights: [],
      sources: [],
      followUpSuggestions: [],
      mode: "LIGHT",
      warnings: [],
    };
  }

  const title = (args.executeSpec.title ?? "").toString().trim() || "Work order";
  const description = args.executeSpec.description != null ? String(args.executeSpec.description) : null;
  const due_date = args.executeSpec.due_date != null ? String(args.executeSpec.due_date) : null;
  const priority = args.executeSpec.priority ?? null;
  const category = args.executeSpec.category ?? null;
  const assetId = args.executeSpec.assetId ?? null;

  // Basic safety sanitization.
  const safePriority =
    priority && PRIORITY_ALLOWED.includes(priority as (typeof PRIORITY_ALLOWED)[number]) ? priority : "medium";
  const safeCategory =
    category && CATEGORY_ALLOWED.includes(category as (typeof CATEGORY_ALLOWED)[number]) ? category : null;

  const fd = new FormData();
  fd.set("company_id", companyId);
  fd.set("title", title);
  fd.set("priority", safePriority);
  if (description != null) fd.set("description", description);
  if (due_date) fd.set("due_date", due_date);
  if (safeCategory) fd.set("category", safeCategory);
  if (assetId) fd.set("asset_id", assetId);

  const result = await saveWorkOrder(
    {},
    fd,
    { portalContext: { tenantId: args.tenantId, companyId } }
  );

  if (result.error) {
    return {
      intent: "ACTION_CREATE_WORK_ORDER",
      answer: "I couldn’t create that work order. Try refining the details and confirm again.",
      bulletHighlights: [],
      sources: [],
      followUpSuggestions: ["Open Work Orders to create manually.", "Ask Cornerstone to draft a clearer request."],
      mode: "LIGHT",
      warnings: [],
    };
  }

  revalidatePath("/work-orders");
  revalidatePath("/dispatch");
  if (assetId) revalidatePath(`/assets/${assetId}`);

  return {
    intent: "ACTION_CREATE_WORK_ORDER",
    answer: result.workOrderNumber
      ? `Created work order ${result.workOrderNumber} successfully.`
      : "Created the work order successfully.",
    bulletHighlights: [
      `Title: ${title}`,
      due_date ? `Due: ${due_date}` : "",
      assetId ? `Asset: ${assetId}` : "",
    ].filter(Boolean),
    sources: [],
    followUpSuggestions: ["Open the new work order to verify details.", "Ask Cornerstone for a quick summary."],
    mode: "LIGHT",
    warnings: [],
  };
}

