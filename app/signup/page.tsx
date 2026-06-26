import type { Metadata } from "next";
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

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const params = await searchParams;
  const source = params?.source === "demo" ? "demo" : "";

  return (
    <FleetAuthLayout
      title="Create your account"
      subtitle={
        source === "demo"
          ? "Set up your workspace and explore operational intelligence."
          : "Get started with Cornerstone Fleet Intelligence."
      }
      footer={<FleetAuthLegalFooter />}
    >
      <SignupForm source={source} />
    </FleetAuthLayout>
  );
}
