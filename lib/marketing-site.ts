/**
 * Cornerstone OS — Marketing site structure.
 * Used for navigation, internal linking, and SEO metadata.
 */

import type { Metadata } from "next";

export const SITE_NAME = "Cornerstone OS";
export const SITE_TAGLINE = "The Operations System for Maintenance Teams";

/** Base URL for canonical, Open Graph, and sitemap. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) ||
  "https://cornerstonecmms.com";

export const ROUTES = {
  home: "/",
  product: "/product",
  productInventoryProcurement: "/product/inventory-procurement",
  pricing: "/pricing",
  foundingCustomer: "/founding-customer",
  howItWorks: "/how-it-works",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  login: "/login",
  signup: "/signup",
} as const;

/** Seeded demo environments by industry (for "See How It Works" modal). */
export const DEMO_ROUTES = {
  facilityMaintenance: "/demo/facility-maintenance",
  industrial: "/demo/industrial",
  schoolDistrict: "/demo/school-district",
  healthcare: "/demo/healthcare",
  /** General platform demo when user chooses "Just show me the platform". */
  general: "/how-it-works",
} as const;

/** Industry options for demo selection modal (name, description, route). */
export const INDUSTRY_DEMO_OPTIONS = [
  {
    id: "facility-maintenance",
    name: "Facility Maintenance Companies",
    description: "Work orders, asset tracking, and technician dispatch for facility operations.",
    route: DEMO_ROUTES.facilityMaintenance,
  },
  {
    id: "industrial",
    name: "Industrial / Manufacturing Maintenance",
    description: "Preventive maintenance, asset monitoring, and operational visibility for production environments.",
    route: DEMO_ROUTES.industrial,
  },
  {
    id: "school-district",
    name: "School District Maintenance Teams",
    description: "Maintenance operations for campuses, buildings, and district facilities.",
    route: DEMO_ROUTES.schoolDistrict,
  },
  {
    id: "healthcare",
    name: "Healthcare Facility Maintenance Teams",
    description: "Maintenance coordination for hospitals, clinics, and healthcare facilities.",
    route: DEMO_ROUTES.healthcare,
  },
] as const;

/**
 * Maps marketing demo slug to seeded tenant slug and demo login email.
 * Demo users must exist in Supabase Auth and be linked to the tenant via tenant_memberships.
 * See scripts/seed-demo/README.md for setup.
 */
export const DEMO_LOGIN_CONFIG: Record<
  string,
  { tenantSlug: string; demoEmail: string; label: string }
> = {
  "facility-maintenance": {
    tenantSlug: "summit-facility-demo",
    demoEmail: "facility-demo@cornerstonecmms.com",
    label: "Facility Maintenance",
  },
  industrial: {
    tenantSlug: "northstar-manufacturing-demo",
    demoEmail: "manufacturing-demo@cornerstonecmms.com",
    label: "Industrial & Manufacturing",
  },
  "school-district": {
    tenantSlug: "riverside-schools-demo",
    demoEmail: "school-demo@cornerstonecmms.com",
    label: "School District",
  },
  healthcare: {
    tenantSlug: "mercy-healthcare-demo",
    demoEmail: "healthcare-demo@cornerstonecmms.com",
    label: "Healthcare",
  },
};

export const FEATURES = [
  { slug: "work-order-management", title: "Work Order Management", href: "/features/work-order-management" },
  { slug: "preventive-maintenance", title: "Preventive Maintenance", href: "/features/preventive-maintenance" },
  { slug: "asset-management", title: "Asset Management", href: "/features/asset-management" },
  { slug: "dispatch-scheduling", title: "Dispatch & Scheduling", href: "/features/dispatch-scheduling" },
  { slug: "technician-mobile", title: "Technician Mobile Experience", href: "/features/technician-mobile" },
  { slug: "reporting-dashboards", title: "Reporting & Dashboards", href: "/features/reporting-dashboards" },
  { slug: "request-portal", title: "Request Portal", href: "/features/request-portal" },
  { slug: "ai-automation", title: "AI & Automation", href: "/features/ai-automation" },
] as const;

export const INDUSTRIES = [
  { slug: "facility-maintenance-software", title: "Facility Maintenance Companies", href: "/facility-maintenance-software" },
  { slug: "industrial-maintenance-software", title: "Industrial / Manufacturing Maintenance", href: "/industrial-maintenance-software" },
  { slug: "school-maintenance-software", title: "School District Maintenance Teams", href: "/school-maintenance-software" },
  { slug: "healthcare-maintenance-software", title: "Healthcare Facility Maintenance Teams", href: "/healthcare-maintenance-software" },
] as const;

export type FeatureSlug = (typeof FEATURES)[number]["slug"];
export type IndustrySlug = (typeof INDUSTRIES)[number]["slug"];

/** Map route slug to industry content key (industry-content.ts). */
export const INDUSTRY_ROUTE_TO_CONTENT_KEY: Record<
  IndustrySlug,
  import("@/lib/industry-content").IndustryContentKey
> = {
  "facility-maintenance-software": "facility-maintenance",
  "industrial-maintenance-software": "industrial-manufacturing",
  "school-maintenance-software": "school-districts",
  "healthcare-maintenance-software": "healthcare",
};

/** Screenshots per industry route (full paths under /public/). */
export const INDUSTRY_SCREENSHOTS: Record<
  IndustrySlug,
  { main: string; secondary: string }
> = {
  "facility-maintenance-software": {
    main: "/screenshots/dispatch.png",
    secondary: "/screenshots/asset-intelligence.png",
  },
  "industrial-maintenance-software": {
    main: "/screenshots/assets.png",
    secondary: "/screenshots/preventive-maintenance.png",
  },
  "school-maintenance-software": {
    main: "/screenshots/work-orders.png",
    secondary: "/screenshots/assets.png",
  },
  "healthcare-maintenance-software": {
    main: "/screenshots/operations-dashboard.png",
    secondary: "/screenshots/preventive-maintenance.png",
  },
};

/** Screenshot paths (full, under /public/screenshots/) per feature slug. */
export const FEATURE_SCREENSHOTS: Partial<Record<FeatureSlug, string>> = {
  "work-order-management": "/screenshots/work-orders.png",
  "preventive-maintenance": "/screenshots/preventive-maintenance.png",
  "asset-management": "/screenshots/assets.png",
  "dispatch-scheduling": "/screenshots/dispatch.png",
  "technician-mobile": "/screenshots/technician-mobile.png",
  "reporting-dashboards": "/screenshots/operations-dashboard.png",
  "request-portal": "/screenshots/request-portal.png",
  "ai-automation": "/screenshots/operations-dashboard.png",
};

/**
 * Secondary screenshot for feature detail pages (shown below the workflow section).
 * A different view of the platform so the feature page doesn't show the same image twice.
 */
export const FEATURE_SECONDARY_SCREENSHOTS: Partial<Record<FeatureSlug, string>> = {
  "work-order-management": "/screenshots/dispatch.png",
  "preventive-maintenance": "/screenshots/assets.png",
  "asset-management": "/screenshots/operations-dashboard.png",
  "dispatch-scheduling": "/screenshots/technician-mobile.png",
  "technician-mobile": "/screenshots/work-orders.png",
  "reporting-dashboards": "/screenshots/dashboard.png",
  "request-portal": "/screenshots/work-orders.png",
  "ai-automation": "/screenshots/dashboard.png",
};

/** Hero screenshot paths (full, under /public/screenshots/). */
export const HERO_SCREENSHOTS = {
  dashboard: "/screenshots/dashboard.png",
  dispatch: "/screenshots/dispatch.png",
  workOrders: "/screenshots/work-orders.png",
} as const;

/** Core features highlighted on homepage (subset of FEATURES). */
export const CORE_FEATURES_HOME = FEATURES.slice(0, 6);

/** Navigation: main header links (for marketing layout). */
export const NAV = {
  product: {
    label: "Product",
    href: ROUTES.product,
    children: [
      { label: "Product Overview", href: ROUTES.product },
      ...FEATURES.filter((f) => f.slug !== "ai-automation").map((f) => ({ label: f.title, href: f.href })),
      { label: "Inventory & Procurement", href: ROUTES.productInventoryProcurement },
      ...FEATURES.filter((f) => f.slug === "ai-automation").map((f) => ({ label: f.title, href: f.href })),
    ],
  },
  industries: {
    label: "Industries",
    href: "/industries",
    children: INDUSTRIES.map((i) => ({ label: i.title, href: i.href })),
  },
  pricing: { label: "Pricing", href: ROUTES.pricing },
  foundingCustomer: { label: "Founding Customer", href: ROUTES.foundingCustomer },
  howItWorks: { label: "How It Works", href: ROUTES.howItWorks },
  about: { label: "About", href: ROUTES.about },
  contact: { label: "Contact", href: ROUTES.contact },
} as const;

/** SEO: default title template. */
export const SEO_TITLE_TEMPLATE = "%s | Cornerstone OS";

/** SEO metadata by route (for static pages). Keyword-optimized for CMMS and maintenance software. */
export const SEO: Record<string, { title: string; description: string }> = {
  [ROUTES.home]: {
    title: "CMMS & Maintenance Management Software | Cornerstone OS",
    description:
      "Maintenance management software and CMMS for teams that need speed, visibility, and control. Work orders, preventive maintenance, assets, dispatch, inventory management, vendor management, purchase orders, maintenance procurement, and reporting in one facility maintenance platform.",
  },
  [ROUTES.product]: {
    title: "Product Overview | CMMS Software & Maintenance Management",
    description:
      "Cornerstone OS brings work order management, preventive maintenance, asset management, dispatch, technician workflows, inventory, vendors, purchase orders, and reporting together in one maintenance operations platform.",
  },
  [ROUTES.productInventoryProcurement]: {
    title: "Inventory & Procurement Software for Maintenance Teams | Cornerstone OS",
    description:
      "Inventory management software and maintenance procurement software for CMMS teams. Cornerstone OS connects inventory tracking, vendor management, products, and purchase order software directly to maintenance operations.",
  },
  [ROUTES.pricing]: {
    title: "Pricing | Work Order Management Software That Bills Per Technician",
    description:
      "CMMS pricing that bills only technicians. Managers, supervisors, dispatchers, and office staff included. $75/technician/month. Founding customer pricing for the first 25 customers.",
  },
  [ROUTES.foundingCustomer]: {
    title: "Founding Customer Program | CMMS Early Access",
    description:
      "Join the first 25 founding customers. Lifetime locked pricing, roadmap influence, priority feature requests, early access, and concierge onboarding for our maintenance management software.",
  },
  [ROUTES.howItWorks]: {
    title: "How It Works | Get Started with Our CMMS",
    description: "Get started with Cornerstone OS maintenance software. Start a free trial, explore the product, or request a demo.",
  },
  [ROUTES.about]: {
    title: "About | Cornerstone OS — Facility Management Platform",
    description: "Building the operations system for maintenance teams. Modern CMMS and facility maintenance software for asset-heavy organizations.",
  },
  [ROUTES.contact]: {
    title: "Contact & Demo | Cornerstone OS CMMS",
    description: "Get in touch or request a demo of our maintenance management software. Start a free trial or explore the product tour.",
  },
  "/industries": {
    title: "Industries | Facility Maintenance Software by Sector",
    description: "CMMS and maintenance management software for facility maintenance, industrial maintenance software, school maintenance software, and healthcare facility maintenance.",
  },
};

/** Build metadata with Open Graph for a marketing page. */
export function buildMarketingMetadata(
  title: string,
  description: string,
  path: string,
  options?: { noIndex?: boolean }
): Metadata {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return {
    title,
    description,
    robots: options?.noIndex ? "noindex,nofollow" : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** SEO for feature pages (keyed by slug). Keyword-optimized for CMMS and maintenance software. */
export const SEO_FEATURES: Record<FeatureSlug, { title: string; description: string }> = {
  "work-order-management": {
    title: "Work Order Management Software | CMMS",
    description: "Work order management software to create, dispatch, and track work orders in one system. Maintenance management software built for operations teams.",
  },
  "preventive-maintenance": {
    title: "Preventive Maintenance Software | PM & CMMS",
    description: "Preventive maintenance software to schedule and manage PM. CMMS with templates, compliance, and asset history for facility and industrial maintenance.",
  },
  "asset-management": {
    title: "Asset Management Software | CMMS",
    description: "Asset management software for equipment lifecycle, maintenance history, and asset intelligence. CMMS asset management for facility management and operations.",
  },
  "dispatch-scheduling": {
    title: "Dispatch & Scheduling Software for Maintenance",
    description: "Dispatch and scheduling software for maintenance teams. Assign technicians, schedule work, optimize routes. Maintenance management software for field operations.",
  },
  "technician-mobile": {
    title: "Technician Mobile App | Mobile CMMS",
    description: "Mobile CMMS for technicians. Mobile work orders, photos, and updates in the field. Maintenance software built for the field.",
  },
  "reporting-dashboards": {
    title: "Maintenance Reporting & Dashboards | CMMS",
    description: "Maintenance reporting and dashboards for operations. CMMS reporting software for leadership, KPIs, and operational analytics.",
  },
  "request-portal": {
    title: "Maintenance Request Portal | CMMS",
    description: "Maintenance request portal for tenants and staff. CMMS software that turns requests into work orders for facility maintenance and work order management.",
  },
  "ai-automation": {
    title: "AI & Automation for Maintenance | CMMS",
    description: "AI and automation for maintenance operations. Automate work orders, scheduling, and insights in your CMMS and maintenance management software.",
  },
};

/** SEO for industry pages (keyed by route slug). Unique title and meta description per industry. */
export const SEO_INDUSTRIES: Record<IndustrySlug, { title: string; description: string }> = {
  "facility-maintenance-software": {
    title: "Facility Maintenance Software | CMMS for Facilities",
    description:
      "Facility maintenance software and CMMS for facilities teams. Work order management, dispatch, assets, vendors, and compliance in one facility management platform.",
  },
  "industrial-maintenance-software": {
    title: "Industrial Maintenance Software | CMMS for Manufacturing",
    description:
      "Industrial maintenance software and CMMS for manufacturing. Plant maintenance, preventive maintenance, asset tracking, and PM scheduling for industrial operations.",
  },
  "school-maintenance-software": {
    title: "School Maintenance Software | K-12 CMMS for School Districts",
    description:
      "School maintenance software and CMMS for school districts. Work orders, buildings, grounds, and operations for K-12 facility maintenance and compliance.",
  },
  "healthcare-maintenance-software": {
    title: "Healthcare Facility Maintenance Software | Hospital CMMS",
    description:
      "Healthcare facility maintenance software and hospital CMMS. Clinic and facility maintenance, Joint Commission compliance, and uptime in one maintenance platform.",
  },
};
