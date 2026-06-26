/**
 * Cornerstone Fleet Intelligence — marketing site constants.
 * Positioning: The Dispatch Operating System for Industrial Fleets.
 */

export const FLEET_SITE_NAME = "Cornerstone Fleet Intelligence";
export const FLEET_SITE_SHORT = "Fleet Intelligence";
export const FLEET_TAGLINE = "The Dispatch Operating System for Industrial Fleets";
export const FLEET_POSITIONING =
  "The operational intelligence layer that connects your existing systems — not another fleet management platform.";

export const FLEET_ROUTES = {
  home: "/",
  integrations: "/integrations",
  implementation: "/launch",
  launchEstimator: "/launch-estimator",
  contact: "/contact",
  login: "/login",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const FLEET_ANCHORS = {
  outcomes: "#outcomes",
  operationalLoop: "#operational-loop",
  intelligence: "#intelligence",
  commandCenter: "#command-center",
  integrations: "#integrations",
  impact: "#impact",
  security: "#security",
} as const;

export function fleetHomeSection(anchor: string): string {
  return `${FLEET_ROUTES.home}${anchor}`;
}

export const FLEET_NAV = {
  platform: {
    label: "Platform",
    children: [
      { label: "Business Outcomes", href: fleetHomeSection(FLEET_ANCHORS.outcomes) },
      { label: "The Operational Loop", href: fleetHomeSection(FLEET_ANCHORS.operationalLoop) },
      { label: "Fleet Command Center", href: fleetHomeSection(FLEET_ANCHORS.commandCenter) },
      { label: "Operational Impact", href: fleetHomeSection(FLEET_ANCHORS.impact) },
    ],
  },
  integrations: { label: "Integrations", href: FLEET_ROUTES.integrations },
  implementation: { label: "Implementation", href: FLEET_ROUTES.implementation },
  launchEstimator: { label: "Launch Estimator", href: FLEET_ROUTES.launchEstimator },
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

export const FLEET_HERO = {
  eyebrow: "CORNERSTONE FLEET INTELLIGENCE",
  headline: "Every Dispatch Decision Matters.",
  subheadline:
    "Cornerstone helps industrial fleet operators reduce deadhead, improve utilization, protect revenue, and dispatch with confidence using operational intelligence and explainable AI.",
  primaryCta: "Request Demo",
  secondaryCta: "See Fleet Intelligence",
} as const;

export const FLEET_TRUST_BADGES = [
  "Integration-first — keep your existing stack",
  "Explainable AI recommendations",
  "Live in weeks, not months",
] as const;

/** Outcome-led pillars — not feature-first. */
export const FLEET_OUTCOMES = [
  {
    title: "Reduce Deadhead",
    description:
      "Cut empty miles by connecting telematics, dispatch, and job data into one decision layer that surfaces smarter routing before margin erodes.",
  },
  {
    title: "Increase Contribution",
    description:
      "See estimated contribution impact on every recommendation — so dispatchers approve decisions that protect profitability, not just on-time performance.",
  },
  {
    title: "Improve Fleet Utilization",
    description:
      "Identify idle capacity, rebalance branches under load, and redeploy units before utilization drops below target.",
  },
  {
    title: "Protect Revenue",
    description:
      "Surface revenue at risk from missed SLAs, capacity overload, and suboptimal assignments — with clear financial context for every action.",
  },
  {
    title: "Improve Dispatcher Productivity",
    description:
      "Replace manual triage with a prioritized recommendation queue — one next-best action at a time, with explainable reasoning.",
  },
  {
    title: "Operational Visibility",
    description:
      "One command center for utilization, on-time performance, contribution margin, and active recommendations across your entire fleet.",
  },
] as const;

export const FLEET_OPERATIONAL_LOOP = [
  {
    step: "Understand",
    description: "Continuously ingest telematics, dispatch, payroll, and financial data from the systems you already use.",
  },
  {
    step: "Recommend",
    description: "AI analyzes operations and surfaces the next best action — with estimated impact on margin, utilization, and service levels.",
  },
  {
    step: "Approve",
    description: "Dispatchers review explainable recommendations and approve with confidence — human judgment stays in control.",
  },
  {
    step: "Execute",
    description: "Approved decisions flow back into your operational workflow. Your team keeps using the software they know.",
  },
  {
    step: "Measure",
    description: "Track utilization, deadhead, contribution, and on-time performance against your operational baseline.",
  },
  {
    step: "Improve",
    description: "Cornerstone learns from outcomes and refines recommendations — a continuous intelligence loop, not a one-time report.",
  },
] as const;

export const FLEET_IMPACT_METRICS = [
  { label: "Fleet utilization", value: "+12%", detail: "Average improvement in pilot deployments" },
  { label: "Deadhead reduction", value: "-18%", detail: "Fewer empty miles through smarter routing" },
  { label: "Contribution protected", value: "+$142K", detail: "Monthly margin protected per 25-truck fleet" },
  { label: "On-time performance", value: "91%", detail: "Service levels maintained under load" },
] as const;

export const FLEET_IMPLEMENTATION_WEEKS = [
  {
    week: "Week 1",
    title: "Connect Systems",
    description:
      "Link telematics, dispatch, ERP, payroll, and field service platforms through native connectors, REST API, webhooks, or CSV import. No rip-and-replace.",
  },
  {
    week: "Week 2",
    title: "Baseline Operations",
    description:
      "Cornerstone maps your current utilization, deadhead patterns, margin drivers, branch capacity, and service levels — establishing the operational baseline recommendations build on.",
  },
  {
    week: "Week 3",
    title: "AI Recommendations",
    description:
      "Explainable recommendations go live in Fleet Command Center. Your dispatch team reviews, approves, and acts — with clear impact estimates on every decision.",
  },
  {
    week: "Week 4",
    title: "Go Live",
    description:
      "Full operational intelligence loop running. Your team keeps using their existing software. Cornerstone makes operations smarter.",
  },
] as const;

export type FleetIntegrationPartner = {
  name: string;
  description?: string;
};

export type FleetIntegrationCategory = {
  id: string;
  title: string;
  description: string;
  partners: readonly FleetIntegrationPartner[];
};

export const FLEET_INTEGRATION_ECOSYSTEM: readonly FleetIntegrationCategory[] = [
  {
    id: "telematics",
    title: "Telematics",
    description: "GPS, ELD, dashcam, and vehicle diagnostics from the platforms your fleet already runs on.",
    partners: [
      { name: "Samsara" },
      { name: "Geotab" },
      { name: "Motive" },
      { name: "Verizon Connect" },
      { name: "Azuga" },
      { name: "GPS Insight" },
    ],
  },
  {
    id: "fleet-management",
    title: "Fleet Management",
    description: "Maintenance records, fuel data, asset lifecycle, and fleet operations systems.",
    partners: [
      { name: "Fleetio" },
      { name: "Whip Around" },
      { name: "RTA Fleet" },
      { name: "AssetWorks" },
      { name: "Dossier" },
    ],
  },
  {
    id: "erp-accounting",
    title: "ERP & Accounting",
    description: "Financial data, invoicing, job costing, and enterprise resource planning.",
    partners: [
      { name: "QuickBooks Online" },
      { name: "NetSuite" },
      { name: "Microsoft Dynamics 365" },
      { name: "Sage Intacct" },
      { name: "Acumatica" },
      { name: "Viewpoint" },
      { name: "CMiC" },
    ],
  },
  {
    id: "field-service",
    title: "Field Service",
    description: "Dispatch, scheduling, work orders, and customer-facing service platforms.",
    partners: [
      { name: "ServiceTitan" },
      { name: "BuildOps" },
      { name: "Jobber" },
      { name: "Housecall Pro" },
      { name: "Salesforce Field Service" },
    ],
  },
  {
    id: "hr-payroll",
    title: "HR & Payroll",
    description: "Labor cost, overtime risk, PTO, and workforce data for smarter dispatch decisions.",
    partners: [
      { name: "ADP" },
      { name: "Paylocity" },
      { name: "UKG" },
      { name: "Paycom" },
      { name: "Workday" },
    ],
  },
  {
    id: "data-bi",
    title: "Data & BI",
    description: "Export operational intelligence to your existing analytics and data warehouse stack.",
    partners: [
      { name: "Power BI" },
      { name: "Tableau" },
      { name: "Snowflake" },
      { name: "Databricks" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    description: "Alerts, notifications, and team coordination across your operational workflow.",
    partners: [
      { name: "Microsoft Teams" },
      { name: "Slack" },
      { name: "Twilio" },
      { name: "Email" },
    ],
  },
  {
    id: "open-apis",
    title: "Open APIs & Custom Connectors",
    description: "Connect virtually any modern business system through our integration framework.",
    partners: [
      { name: "REST API", description: "Full programmatic access to operational data and recommendations" },
      { name: "GraphQL", description: "Flexible queries for custom dashboards and workflows" },
      { name: "Webhooks", description: "Real-time event streams from your operational stack" },
      { name: "CSV Import/Export", description: "Baseline data from spreadsheets and legacy exports" },
      { name: "Scheduled Syncs", description: "Automated data refresh on your cadence" },
      { name: "OAuth", description: "Secure, token-based authentication for enterprise integrations" },
      { name: "Custom Connectors", description: "We'll build the connector for your platform" },
    ],
  },
] as const;

/** Compact list for homepage preview */
export const FLEET_INTEGRATIONS_PREVIEW = [
  { name: "Samsara", description: "Telematics & GPS" },
  { name: "Geotab", description: "Fleet tracking & diagnostics" },
  { name: "Motive", description: "ELD & dashcam data" },
  { name: "Fleetio", description: "Maintenance & asset records" },
  { name: "QuickBooks", description: "Financial & job costing" },
  { name: "ServiceTitan", description: "Field service & dispatch" },
  { name: "REST API", description: "Custom system connections" },
  { name: "Webhooks", description: "Real-time event streams" },
] as const;

export const FLEET_INTEGRATIONS = FLEET_INTEGRATIONS_PREVIEW;

export const FLEET_INTEGRATIONS_PAGE = {
  headline: "Built Around Your Existing Systems",
  subheadline:
    "You shouldn't have to replace the software you've already invested in. Cornerstone connects your operational data into one intelligent decision platform.",
  integrationFirst:
    "We are integration-first. Our goal is to connect to every major operational platform our customers use. If your software has an API, webhook, database, CSV export, or integration capability, we want Cornerstone to connect to it.",
  implementationSpeed:
    "We believe implementation should be measured in days—not months.",
  customConnector: {
    headline: "Don't see your software?",
    subheadline: "We'll build the connector.",
    body: "Our integration framework is designed to connect with virtually any modern business system. If your platform exposes data, we'll work with you to integrate it.",
    cta: "Talk to Integration Team",
  },
} as const;

export const FLEET_IMPLEMENTATION_PAGE = {
  headline: "Operational Intelligence Launch",
  subheadline:
    "Not a multi-month ERP rollout. Connect your systems, establish an operational baseline, and start receiving explainable recommendations within four weeks.",
  keepExisting:
    "Your team keeps using their existing software — telematics, dispatch, ERP, field service, and payroll. Cornerstone sits on top as the intelligence layer that makes operations smarter.",
} as const;

export const FLEET_ABOUT = {
  headline: "Why Cornerstone Exists",
  subheadline:
    "Industrial fleet operators make hundreds of dispatch decisions every day. Most of those decisions happen without the operational intelligence to protect margin, utilization, and service levels.",
  problem: {
    title: "The Problem",
    body: "Fleet operators run on disconnected systems — telematics in one platform, dispatch in another, financials in a third. Decisions are made on instinct, spreadsheets, and incomplete data. Margin erodes quietly. Deadhead accumulates. Capacity overloads go unnoticed until revenue is at risk.",
  },
  dos: {
    title: "The Dispatch Operating System",
    body: "Cornerstone is the operational intelligence layer that connects your existing systems into one decision platform. We don't replace your ERP, fleet management, telematics, or dispatch software. We make every dispatch decision smarter by surfacing explainable recommendations grounded in your real operational data.",
  },
  ai: {
    title: "Explainable AI",
    body: "Every recommendation shows why it was made — travel impact, utilization, capacity, GPS freshness, and contribution margin. Dispatchers stay in control. AI recommends. Humans approve. Operations improve.",
  },
  integrations: {
    title: "Built Around Existing Systems",
    body: "Integration-first by design. If your platform has an API, webhook, or data export, we'll connect to it. Implementation is measured in weeks, not months. Your team keeps the software they know.",
  },
  vision: {
    title: "Our Vision",
    body: "Every industrial fleet operator should have access to the same operational intelligence that enterprise logistics companies use — without replacing the systems they've already invested in. Cornerstone is building that intelligence layer.",
  },
} as const;

export const FLEET_SEO = {
  home: {
    title: "Fleet Intelligence Platform | Cornerstone — The Dispatch Operating System",
    description:
      "Cornerstone Fleet Intelligence helps industrial fleet operators reduce deadhead, improve utilization, protect revenue, and dispatch with confidence. Integration-first operational intelligence with explainable AI.",
  },
  integrations: {
    title: "Integrations | Cornerstone Fleet Intelligence",
    description:
      "Connect Samsara, Geotab, Fleetio, QuickBooks, ServiceTitan, and 40+ operational platforms. Cornerstone is the intelligence layer on top of your existing stack — integration-first, live in weeks.",
  },
  implementation: {
    title: "Implementation | Cornerstone Fleet Intelligence",
    description:
      "Operational Intelligence Launch in four weeks. Connect systems, baseline operations, activate AI recommendations, go live — without replacing your existing software.",
  },
  launchEstimator: {
    title: "Launch Estimator | Cornerstone Fleet Intelligence",
    description:
      "Scope your Fleet Intelligence rollout in minutes. Estimate implementation investment, timeline, integrations, and operational focus — interactive scoping for industrial fleet operators.",
  },
  about: {
    title: "About | Cornerstone Fleet Intelligence",
    description:
      "Cornerstone is the Dispatch Operating System for industrial fleets — operational intelligence and explainable AI built around the systems you already use.",
  },
  contact: {
    title: "Request Demo | Cornerstone Fleet Intelligence",
    description:
      "Request a demo of Cornerstone Fleet Intelligence. See how operational intelligence and explainable AI improve dispatch decisions for industrial fleets.",
  },
} as const;

/** Messaging framework for internal alignment */
export const FLEET_MESSAGING = {
  category: "Operational Intelligence / Dispatch Operating System",
  notThis: [
    "CMMS",
    "Fleet management replacement",
    "Telematics platform",
    "ERP replacement",
    "Dispatch software replacement",
  ],
  isThis: [
    "Intelligence layer on top of existing systems",
    "Explainable AI for dispatch decisions",
    "Integration-first platform",
    "Operational decision support",
  ],
  audience: "Industrial fleet operators, dispatch leaders, operations executives, fleet owners",
  proofPoints: FLEET_IMPACT_METRICS,
  primaryCta: "Request Demo",
  secondaryCta: "See Fleet Intelligence",
} as const;
