import { SITE_URL } from "@/lib/marketing-site";
import { sendEmailAlert } from "@/src/lib/notifications";

const INTERNAL_SIGNUP_RECIPIENT = "daulton@cornerstonecmms.co";

export type InternalSignupNotificationPayload = {
  name?: string | null;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  technicianCount?: string | number | null;
  signupTimestamp?: string;
};

export async function sendInternalNotificationEmail(
  payload: InternalSignupNotificationPayload
): Promise<boolean> {
  const timestamp = payload.signupTimestamp ?? new Date().toISOString();
  const safe = (value?: string | number | null) =>
    value === undefined || value === null || `${value}`.trim() === "" ? "Not provided" : `${value}`;

  const message = [
    "A new user signed up for a Cornerstone free trial/demo.",
    "",
    `Name: ${safe(payload.name)}`,
    `Email: ${safe(payload.email)}`,
    `Company name: ${safe(payload.companyName)}`,
    `Phone: ${safe(payload.phone)}`,
    `Technician count: ${safe(payload.technicianCount)}`,
    `Signup timestamp: ${timestamp}`,
    "",
    `Dashboard: ${SITE_URL}/dashboard`,
    `Platform users: ${SITE_URL}/platform`,
  ].join("\n");

  const sent = await sendEmailAlert({
    subject: "New Cornerstone Demo Signup",
    message,
    recipients: [INTERNAL_SIGNUP_RECIPIENT],
  });

  if (sent) {
    console.info(
      `[signup-notification] Internal signup email sent for ${payload.email} at ${timestamp}.`
    );
  } else {
    console.warn(
      `[signup-notification] Internal signup email failed/skipped for ${payload.email}.`
    );
  }

  return sent;
}
