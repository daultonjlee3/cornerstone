import { redirect } from "next/navigation";
import { FLEET_ROUTES } from "@/lib/fleet-marketing-site";

/** Legacy contact URL — canonical sales motion is Request Pilot. */
export default function ContactPage() {
  redirect(FLEET_ROUTES.requestPilot);
}
