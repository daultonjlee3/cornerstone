import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/src/lib/geocoding";
import { resolveExternalMapping, upsertExternalMapping } from "@/src/lib/integrations/mappings";

export type JobWebhookPayload = {
  external_id: string;
  branch_code: string;
  title: string;
  revenue_estimate: number;
  required_truck_type: string;
  scheduled_start: string;
  scheduled_end: string;
  site_name?: string;
  site_external_id?: string;
  site_address?: string;
  site_latitude?: number;
  site_longitude?: number;
  priority?: string;
  status?: string;
  unit_number?: string;
  description?: string;
};

export type JobUpsertError = { external_id: string; reason: string };

export type JobUpsertResult = {
  processed: number;
  failed: number;
  errors: JobUpsertError[];
  affectedDates: string[];
};

function toDateOnly(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const dateOnly = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  if (Number.isNaN(Date.parse(`${dateOnly}T00:00:00.000Z`))) return null;
  return dateOnly;
}

async function resolveCompanyId(
  supabase: SupabaseClient,
  tenantId: string,
  connectionConfig: Record<string, unknown>,
  branchCompanyId: string
): Promise<string> {
  const fromConfig = connectionConfig.default_company_id;
  if (typeof fromConfig === "string" && fromConfig) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("id", fromConfig)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  return branchCompanyId;
}

async function resolveBranch(
  supabase: SupabaseClient,
  tenantId: string,
  branchCode: string
): Promise<{ id: string; company_id: string } | null> {
  const { data } = await supabase
    .from("branches")
    .select("id, company_id")
    .eq("tenant_id", tenantId)
    .eq("code", branchCode)
    .maybeSingle();
  return data as { id: string; company_id: string } | null;
}

async function resolveOrCreateSite(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    companyId: string;
    connectionId: string;
    job: JobWebhookPayload;
  }
): Promise<{ siteId: string | null; error?: string }> {
  const { tenantId, companyId, connectionId, job } = input;

  if (job.site_external_id) {
    const mapped = await resolveExternalMapping(
      supabase,
      connectionId,
      "customer_site",
      job.site_external_id,
      tenantId
    );
    if (mapped) return { siteId: mapped };
  }

  const siteName = job.site_name?.trim();
  if (!siteName && !job.site_external_id) {
    return { siteId: null, error: "Missing site_name or site_external_id." };
  }

  if (siteName) {
    const { data: existing } = await supabase
      .from("customer_sites")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .ilike("name", siteName)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return { siteId: existing.id as string };
  }

  let latitude = job.site_latitude ?? null;
  let longitude = job.site_longitude ?? null;
  if ((latitude == null || longitude == null) && job.site_address?.trim()) {
    const geocoded = await geocodeAddress(job.site_address.trim());
    latitude = geocoded?.latitude ?? latitude;
    longitude = geocoded?.longitude ?? longitude;
  }

  if (latitude == null || longitude == null) {
    return { siteId: null, error: "Site requires coordinates or geocodable address." };
  }

  const { data: inserted, error } = await supabase
    .from("customer_sites")
    .insert({
      company_id: companyId,
      tenant_id: tenantId,
      name: siteName ?? job.site_external_id ?? "Site",
      address_line1: job.site_address?.trim() || null,
      latitude,
      longitude,
      external_source_id: job.site_external_id?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    return { siteId: null, error: error?.message ?? "Failed to create site." };
  }

  const siteId = inserted.id as string;
  if (job.site_external_id) {
    await upsertExternalMapping(supabase, {
      connectionId,
      tenantId,
      entityType: "customer_site",
      externalId: job.site_external_id,
      internalId: siteId,
    });
  }

  return { siteId };
}

export async function upsertJobFromWebhook(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    connectionConfig: Record<string, unknown>;
    job: JobWebhookPayload;
  }
): Promise<
  | { ok: true; jobId: string; affectedDates: string[] }
  | { ok: false; reason: string }
> {
  const { tenantId, connectionId, connectionConfig, job } = input;

  const externalId = job.external_id?.trim();
  const branchCode = job.branch_code?.trim();
  const title = job.title?.trim();
  const truckType = job.required_truck_type?.trim();

  if (!externalId || !branchCode || !title || !truckType) {
    return { ok: false, reason: "Missing external_id, branch_code, title, or required_truck_type." };
  }

  if (!job.scheduled_start?.trim() || !job.scheduled_end?.trim()) {
    return { ok: false, reason: "Missing scheduled_start or scheduled_end." };
  }

  const revenue = Number(job.revenue_estimate);
  if (!Number.isFinite(revenue) || revenue < 0) {
    return { ok: false, reason: "revenue_estimate is required and must be >= 0." };
  }

  const branch = await resolveBranch(supabase, tenantId, branchCode);
  if (!branch) return { ok: false, reason: `Unknown branch_code: ${branchCode}` };

  const companyId = await resolveCompanyId(supabase, tenantId, connectionConfig, branch.company_id);

  const siteResult = await resolveOrCreateSite(supabase, {
    tenantId,
    companyId,
    connectionId,
    job,
  });
  if (!siteResult.siteId) {
    return { ok: false, reason: siteResult.error ?? "Could not resolve site." };
  }

  let assignedTruckId: string | null = null;
  const unitNumber = job.unit_number?.trim();
  if (unitNumber) {
    const { data: truck } = await supabase
      .from("trucks")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branch.id)
      .eq("unit_number", unitNumber)
      .maybeSingle();
    assignedTruckId = (truck as { id?: string } | null)?.id ?? null;
  }

  const existingJobId = await resolveExternalMapping(
    supabase,
    connectionId,
    "fleet_job",
    externalId,
    tenantId
  );

  const payload = {
    branch_id: branch.id,
    company_id: companyId,
    tenant_id: tenantId,
    customer_site_id: siteResult.siteId,
    title,
    description: job.description?.trim() || null,
    status: job.status?.trim() || (assignedTruckId ? "scheduled" : "unassigned"),
    priority: job.priority?.trim() || "medium",
    scheduled_start: job.scheduled_start.trim(),
    scheduled_end: job.scheduled_end.trim(),
    revenue_estimate: revenue,
    required_truck_type: truckType,
    assigned_truck_id: assignedTruckId,
    external_source_id: externalId,
  };

  let jobId: string;

  if (existingJobId) {
    const { error } = await supabase
      .from("fleet_jobs")
      .update(payload)
      .eq("id", existingJobId)
      .eq("tenant_id", tenantId);
    if (error) return { ok: false, reason: error.message };
    jobId = existingJobId;
  } else {
    const { data, error } = await supabase
      .from("fleet_jobs")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data?.id) return { ok: false, reason: error?.message ?? "Insert failed." };
    jobId = data.id as string;
  }

  await upsertExternalMapping(supabase, {
    connectionId,
    tenantId,
    entityType: "fleet_job",
    externalId,
    internalId: jobId,
  });

  const affectedDates = new Set<string>();
  const startDate = toDateOnly(job.scheduled_start);
  const endDate = toDateOnly(job.scheduled_end);
  if (startDate) affectedDates.add(startDate);
  if (endDate) affectedDates.add(endDate);

  return {
    ok: true,
    jobId,
    affectedDates: [...affectedDates].sort((a, b) => a.localeCompare(b)),
  };
}

export async function upsertJobsBatch(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    connectionConfig: Record<string, unknown>;
    jobs: JobWebhookPayload[];
  }
): Promise<JobUpsertResult> {
  const errors: JobUpsertError[] = [];
  const affectedDates = new Set<string>();
  let processed = 0;

  for (const job of input.jobs) {
    const result = await upsertJobFromWebhook(supabase, { ...input, job });
    if (result.ok) {
      processed += 1;
      for (const date of result.affectedDates) affectedDates.add(date);
    } else {
      errors.push({
        external_id: job.external_id ?? "unknown",
        reason: result.reason,
      });
    }
  }

  return {
    processed,
    failed: errors.length,
    errors,
    affectedDates: [...affectedDates].sort((a, b) => a.localeCompare(b)),
  };
}

export function normalizeJobWebhookBody(body: Record<string, unknown>): JobWebhookPayload[] {
  if (Array.isArray(body.jobs)) {
    return body.jobs as JobWebhookPayload[];
  }
  if (body.external_id) {
    return [body as unknown as JobWebhookPayload];
  }
  return [];
}
