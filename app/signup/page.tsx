import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FLEET_SEO } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import {
  FleetAuthLayout,
  FleetAuthLegalFooter,
} from "../components/marketing/fleet/fleet-auth-layout";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = buildMarketingMetadata(
  "Create account | Cornerstone Fleet Intelligence",
  FLEET_SEO.contact.description,
  "/signup"
);

/**
 * Public self-serve signup is disabled — enterprise pilot motion only.
 * Preserved for invited demo workspace setup (`?source=demo`).
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const params = await searchParams;
  if (params?.source !== "demo") {
    redirect("/request-pilot");
  }

  return (
    <FleetAuthLayout
      title="Create your account"
      subtitle="Set up your workspace and explore operational intelligence."
      footer={<FleetAuthLegalFooter />}
    >
      <SignupForm source="demo" />
    </FleetAuthLayout>
  );
}
