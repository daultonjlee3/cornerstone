import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildCrmPayload,
  buildLaunchEstimatePdf,
  calculateLaunchEstimate,
  normalizeInput,
} from "@/lib/launch-estimator";
import type { LaunchEstimatorLead } from "@/lib/launch-estimator/types";
import {
  sendLaunchEstimatorInternalNotification,
  sendLaunchEstimatorProspectEmail,
} from "@/lib/email/sendLaunchEstimatorNotification";

type SubmitBody = {
  input: Parameters<typeof normalizeInput>[0];
  lead: Partial<LaunchEstimatorLead>;
  action: "submit" | "download" | "email";
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = normalizeInput(body.input ?? {});
  if (!input) {
    return NextResponse.json({ error: "Incomplete estimator input" }, { status: 400 });
  }

  const email = body.lead?.email?.trim();
  if (body.action !== "download" && (!email || !email.includes("@"))) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const lead: LaunchEstimatorLead = {
    email: email ?? "estimate@download.local",
    phone: body.lead?.phone?.trim(),
    companyName: body.lead?.companyName?.trim() || input.companyName,
  };

  const result = calculateLaunchEstimate(input);
  const crmPayload = buildCrmPayload(input, lead, result);
  const pdfBytes = await buildLaunchEstimatePdf(input, result, lead);

  if (body.action === "download") {
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cornerstone-launch-estimate.pdf"`,
      },
    });
  }

  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("launch_estimator_leads").insert({
      company_name: crmPayload.company_name,
      email: crmPayload.email,
      phone: crmPayload.phone,
      industry: crmPayload.industry,
      branch_count: crmPayload.branch_count,
      truck_count: crmPayload.truck_count,
      daily_jobs: crmPayload.daily_jobs,
      dispatcher_count: crmPayload.dispatcher_count,
      integration_count: crmPayload.integration_count,
      integrations: crmPayload.integrations,
      goals: crmPayload.goals,
      estimated_implementation: crmPayload.estimated_implementation,
      estimated_implementation_label: crmPayload.estimated_implementation_label,
      complexity: crmPayload.complexity,
      timeline: crmPayload.timeline,
      custom_planning_recommended: crmPayload.custom_planning_recommended,
      payload: crmPayload,
    });
    if (error) {
      console.warn("[launch-estimator] DB insert failed:", error.message);
    }
  }

  void sendLaunchEstimatorInternalNotification(crmPayload);

  if (body.action === "email" && email) {
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    void sendLaunchEstimatorProspectEmail(email, lead.companyName, pdfBase64);
  }

  return NextResponse.json({ ok: true, result, crmPayload });
}
