/**
 * Cornerstone Fleet Intelligence — marketing site constants.
 * Used for homepage, navigation, and fleet positioning.
 */

export const FLEET_SITE_NAME = "Cornerstone Fleet Intelligence";
export const FLEET_SITE_SHORT = "Fleet Intelligence";
export const FLEET_TAGLINE =
  "The operational intelligence platform for industrial fleets";

export const FLEET_ROUTES = {
  home: "/",
  contact: "/contact",
  login: "/login",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const FLEET_ANCHORS = {
  integrations: "#integrations",
  recommendations: "#recommendations",
  commandCenter: "#command-center",
  implementation: "#implementation",
  impact: "#impact",
  security: "#security",
} as const;

export const FLEET_NAV = {
  platform: {
    label: "Platform",
    children: [
      { label: "AI Recommendations", href: FLEET_ANCHORS.recommendations },
      { label: "Fleet Command Center", href: FLEET_ANCHORS.commandCenter },
      { label: "Implementation Center", href: FLEET_ANCHORS.implementation },
      { label: "Operational Impact", href: FLEET_ANCHORS.impact },
    ],
  },
  integrations: { label: "Integrations", href: FLEET_ANCHORS.integrations },
  resources: {
    label: "Resources",
    children: [
      { label: "About", href: FLEET_ROUTES.about },
      { label: "Contact", href: FLEET_ROUTES.contact },
    ],
  },
  company: {
    label: "Company",
    children: [
      { label: "About", href: FLEET_ROUTES.about },
      { label: "Contact", href: FLEET_ROUTES.contact },
      { label: "Privacy", href: FLEET_ROUTES.privacy },
      { label: "Terms", href: FLEET_ROUTES.terms },
    ],
  },
} as const;

export const FLEET_INTEGRATIONS = [
  { name: "Samsara", description: "Telematics, GPS, and driver safety data" },
  { name: "Geotab", description: "Fleet tracking and vehicle diagnostics" },
  { name: "Motive", description: "ELD, dashcam, and fleet management" },
  { name: "Fleetio", description: "Maintenance, fuel, and asset records" },
  { name: "QuickBooks", description: "Payroll, invoicing, and financial data" },
  { name: "REST API", description: "Connect custom systems and data sources" },
  { name: "Webhooks", description: "Real-time event streams from your stack" },
  { name: "CSV Import", description: "Baseline data from spreadsheets and exports" },
] as const;

export const FLEET_TRUST_BADGES = [
  "Secure by design",
  "Works with your systems",
  "Built for fleet operations",
] as const;

export const FLEET_HERO = {
  eyebrow: "THE OPERATIONAL DECISION LAYER",
  headline: "Intelligent decisions. Stronger operations.",
  subheadline:
    "The operational intelligence platform for industrial fleets. Connect your telematics, ERP, dispatch, payroll, and operational systems to deliver real-time recommendations that improve utilization, contribution margin, and fleet performance.",
  primaryCta: "Book a Demo",
  secondaryCta: "See the Platform",
} as const;

export const FLEET_SEO = {
  title: "Fleet Intelligence Platform for Industrial Fleets | Cornerstone",
  description:
    "Cornerstone Fleet Intelligence connects telematics, ERP, dispatch, and payroll to deliver AI-powered recommendations that improve utilization, contribution margin, and fleet performance. One-week implementation.",
} as const;

export const FLEET_IMPACT_METRICS = [
  { label: "Fleet utilization", value: "+12%", detail: "Average improvement in pilot deployments" },
  { label: "Deadhead reduction", value: "-18%", detail: "Fewer empty miles through smarter routing" },
  { label: "Contribution margin", value: "+$142K", detail: "Monthly margin protected per 25-truck fleet" },
  { label: "On-time performance", value: "91%", detail: "Service levels maintained under load" },
] as const;
