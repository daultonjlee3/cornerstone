import { sendEmailAlert } from "@/src/lib/notifications";
import type { LaunchEstimatorCrmPayload } from "@/lib/launch-estimator/types";

const INTERNAL_RECIPIENT = "daulton@cornerstonecmms.co";

export async function sendLaunchEstimatorInternalNotification(
  payload: LaunchEstimatorCrmPayload
): Promise<boolean> {
  const message = [
    "New Fleet Intelligence Launch Estimator submission.",
    "",
    `Company: ${payload.company_name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone ?? "Not provided"}`,
    `Industry: ${payload.industry}`,
    `Branches: ${payload.branch_count}`,
    `Trucks: ${payload.truck_count}`,
    `Daily jobs: ${payload.daily_jobs}`,
    `Dispatchers: ${payload.dispatcher_count}`,
    `Integrations (${payload.integration_count}): ${payload.integrations.join(", ") || "None"}`,
    `Goals: ${payload.goals.join(", ") || "None"}`,
    "",
    `Estimated implementation: ${payload.estimated_implementation_label}`,
    `Complexity: ${payload.complexity}`,
    `Timeline: ${payload.timeline}`,
    `Custom planning recommended: ${payload.custom_planning_recommended ? "Yes" : "No"}`,
    "",
    `Submitted: ${payload.submitted_at}`,
  ].join("\n");

  return sendEmailAlert({
    subject: `Launch Estimator — ${payload.company_name} (${payload.estimated_implementation_label})`,
    message,
    recipients: [INTERNAL_RECIPIENT],
  });
}

export async function sendLaunchEstimatorProspectEmail(
  email: string,
  companyName: string,
  pdfBase64: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail || !email.includes("@")) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Your Cornerstone Fleet Intelligence Launch Estimate",
        text: [
          `Thank you for using the Fleet Intelligence Launch Estimator, ${companyName}.`,
          "",
          "Attached is your implementation scope summary including estimated investment, timeline, integration plan, and operational opportunity ranges.",
          "",
          "Ready to validate your rollout plan? Schedule a discovery call at cornerstonecmms.co/contact",
          "",
          "— Cornerstone Fleet Intelligence",
        ].join("\n"),
        attachments: [
          {
            filename: "cornerstone-fleet-intelligence-launch-estimate.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
