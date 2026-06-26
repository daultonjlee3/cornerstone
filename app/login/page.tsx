import { DEMO_LOGIN_CONFIG } from "@/lib/marketing-site";
import { FLEET_SEO } from "@/lib/fleet-marketing-site";
import { buildMarketingMetadata } from "@/lib/marketing-site";
import type { Metadata } from "next";
import {
  FleetAuthLayout,
  FleetAuthLegalFooter,
} from "../components/marketing/fleet/fleet-auth-layout";
import { LoginForm } from "./login-form";

export const metadata: Metadata = buildMarketingMetadata(
  "Sign in | Cornerstone Fleet Intelligence",
  FLEET_SEO.contact.description,
  "/login"
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  const { next, demo } = await searchParams;
  const demoConfig = demo ? DEMO_LOGIN_CONFIG[demo] : null;
  const demoPassword =
    demoConfig && process.env.DEMO_PASSWORD ? process.env.DEMO_PASSWORD : undefined;

  return (
    <FleetAuthLayout
      title="Sign in"
      subtitle="Access your Fleet Command Center and operational intelligence platform."
      footer={<FleetAuthLegalFooter />}
    >
      <LoginForm
        next={next}
        demoEmail={demoConfig?.demoEmail}
        demoLabel={demoConfig?.label}
        demoPassword={demoPassword}
      />
    </FleetAuthLayout>
  );
}
