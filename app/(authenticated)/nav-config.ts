/**
 * Navigation configuration for the app shell sidebar.
 * Icon keys are resolved in the Sidebar component via lucide-react.
 */

import { featureFlags } from "@/src/lib/features";
import type { ProductProfile } from "@/src/types/fleet";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

export type NavGroup = {
  /** Stable id for React keys and collapse persistence */
  id: string;
  label: string;
  items: NavItem[];
  /** When true, section is visually de-emphasized (secondary). */
  secondary?: boolean;
  /** When true, section starts collapsed (fleet CMMS modules). */
  defaultCollapsed?: boolean;
};

const administrationItems: NavItem[] = [
  { label: "Companies", href: "/companies", icon: "Building" },
  { label: "Users", href: "/settings/users", icon: "Users" },
  { label: "Onboarding Wizard", href: "/onboarding-wizard", icon: "Sparkles" },
  { label: "Settings", href: "/settings", icon: "Settings" },
  { label: "Customers", href: "/customers", icon: "UserCircle" },
  { label: "Contracts", href: "/dashboard/contracts", icon: "FileText" },
  { label: "Invoices", href: "/dashboard/invoices", icon: "Receipt" },
];

function isAdministrationItemEnabled(item: NavItem): boolean {
  if (item.href === "/customers") return featureFlags.customers;
  if (item.href === "/dashboard/contracts") return featureFlags.contracts;
  if (item.href === "/dashboard/invoices") return featureFlags.invoicing;
  return true;
}

const administrationGroup: NavGroup = {
  id: "administration",
  label: "Administration",
  items: administrationItems.filter(isAdministrationItemEnabled),
  secondary: true,
};

/** Fleet-first operational intelligence screens */
const fleetOperationsGroup: NavGroup = {
  id: "fleet-operations",
  label: "Operations",
  items: [
    { label: "Fleet Command Center", href: "/operations", icon: "LayoutGrid" },
    { label: "Recommendations", href: "/operations?focus=recommendations", icon: "Sparkles" },
    { label: "Dispatch Intelligence", href: "/dispatch", icon: "Truck" },
    { label: "Fleet Performance", href: "/reports/operations", icon: "TrendingUp" },
    { label: "Exceptions", href: "/operations?focus=exceptions", icon: "AlertTriangle" },
  ],
};

const fleetOperationsHybridExtras: NavItem[] = [
  { label: "Operations Intelligence", href: "/reports", icon: "BarChart2" },
];

const fleetSetupGroup: NavGroup = {
  id: "fleet-setup",
  label: "Fleet Setup",
  secondary: true,
  defaultCollapsed: true,
  items: [
    { label: "Jobs", href: "/fleet/jobs", icon: "ClipboardList" },
    { label: "Trucks", href: "/fleet/trucks", icon: "Truck" },
    { label: "Branches", href: "/branches", icon: "Warehouse" },
    { label: "Operators", href: "/fleet/operators", icon: "Users" },
    { label: "Sites", href: "/fleet/sites", icon: "MapPin" },
  ],
};

const implementationGroup: NavGroup = {
  id: "implementation",
  label: "Implementation",
  items: [
    { label: "Overview", href: "/implementation", icon: "ListChecks" },
    { label: "Connections", href: "/implementation/connections", icon: "Plug" },
    { label: "Imports", href: "/implementation/imports", icon: "ClipboardList" },
    { label: "Baseline", href: "/implementation/baseline", icon: "TrendingUp" },
    { label: "Readiness", href: "/implementation/readiness", icon: "ListChecks" },
    { label: "Sync History", href: "/implementation/sync-history", icon: "Activity" },
    { label: "Settings", href: "/implementation/settings", icon: "Settings" },
  ],
};

const fleetAnalyticsGroup: NavGroup = {
  id: "analytics",
  label: "Analytics",
  secondary: true,
  items: [{ label: "Reports", href: "/reports", icon: "BarChart2" }],
};

const cmmsAnalyticsGroup: NavGroup = {
  id: "analytics",
  label: "Analytics",
  secondary: true,
  items: [
    { label: "Reports", href: "/reports", icon: "BarChart2" },
    { label: "Operations Intelligence", href: "/reports/operations", icon: "Activity" },
  ],
};

/** CMMS daily operations — primary for cmms profile */
const cmmsOperationsGroup: NavGroup = {
  id: "cmms-operations",
  label: "Operations",
  items: [
    { label: "Operations Center", href: "/operations", icon: "LayoutGrid" },
    { label: "Dispatch", href: "/dispatch", icon: "Truck" },
    { label: "Work Orders", href: "/work-orders", icon: "ClipboardList" },
    { label: "Work Requests", href: "/requests", icon: "Inbox" },
    { label: "Request Portal", href: "/request", icon: "ExternalLink" },
    { label: "Work Queue", href: "/technicians/work-queue", icon: "ListTodo" },
    { label: "Technician Portal", href: "/portal", icon: "Smartphone" },
    { label: "Asset Intelligence", href: "/assets/intelligence", icon: "Activity" },
  ],
};

/** CMMS maintenance modules — collapsed by default for fleet profiles */
const cmmsAssetsGroup: NavGroup = {
  id: "cmms-assets",
  label: "Maintenance & Facilities",
  defaultCollapsed: true,
  secondary: true,
  items: [
    { label: "Work Orders", href: "/work-orders", icon: "ClipboardList" },
    { label: "Work Requests", href: "/requests", icon: "Inbox" },
    { label: "Request Portal", href: "/request", icon: "ExternalLink" },
    { label: "Work Queue", href: "/technicians/work-queue", icon: "ListTodo" },
    { label: "Technician Portal", href: "/portal", icon: "Smartphone" },
    { label: "Asset Intelligence", href: "/assets/intelligence", icon: "Activity" },
    { label: "Assets", href: "/assets", icon: "Box" },
    { label: "Preventive Maintenance", href: "/preventive-maintenance", icon: "CalendarCheck" },
    { label: "Properties", href: "/properties", icon: "MapPin" },
    { label: "Buildings", href: "/buildings", icon: "Building2" },
    { label: "Units", href: "/units", icon: "Layers" },
    { label: "Technicians", href: "/technicians", icon: "Users" },
    { label: "Crews", href: "/crews", icon: "UsersRound" },
    { label: "Inventory", href: "/inventory", icon: "Warehouse" },
    { label: "Products", href: "/products", icon: "Package" },
    { label: "Vendors", href: "/vendors", icon: "Store" },
    { label: "Purchase Orders", href: "/purchase-orders", icon: "ShoppingCart" },
  ],
};

/** CMMS asset modules — expanded by default for cmms-only tenants */
const cmmsAssetsExpandedGroup: NavGroup = {
  id: "assets",
  label: "Assets",
  items: [
    { label: "Assets", href: "/assets", icon: "Box" },
    { label: "Preventive Maintenance", href: "/preventive-maintenance", icon: "CalendarCheck" },
    { label: "Properties", href: "/properties", icon: "MapPin" },
    { label: "Buildings", href: "/buildings", icon: "Building2" },
    { label: "Units", href: "/units", icon: "Layers" },
  ],
};

const cmmsPeopleGroup: NavGroup = {
  id: "people",
  label: "People",
  secondary: true,
  items: [
    { label: "Technicians", href: "/technicians", icon: "Users" },
    { label: "Crews", href: "/crews", icon: "UsersRound" },
  ],
};

const cmmsSupplyGroup: NavGroup = {
  id: "supply",
  label: "Supply",
  secondary: true,
  items: [
    { label: "Inventory", href: "/inventory", icon: "Warehouse" },
    { label: "Products", href: "/products", icon: "Package" },
    { label: "Vendors", href: "/vendors", icon: "Store" },
    { label: "Purchase Orders", href: "/purchase-orders", icon: "ShoppingCart" },
  ],
};

/** Secondary CMMS operations for hybrid tenants (excludes Dispatch — shown in Fleet Operations) */
const hybridCmmsOperationsGroup: NavGroup = {
  id: "cmms-operations",
  label: "CMMS Operations",
  secondary: true,
  items: [
    { label: "Operations Center", href: "/operations", icon: "LayoutGrid" },
    { label: "Work Orders", href: "/work-orders", icon: "ClipboardList" },
    { label: "Work Requests", href: "/requests", icon: "Inbox" },
    { label: "Request Portal", href: "/request", icon: "ExternalLink" },
    { label: "Work Queue", href: "/technicians/work-queue", icon: "ListTodo" },
    { label: "Technician Portal", href: "/portal", icon: "Smartphone" },
    { label: "Asset Intelligence", href: "/assets/intelligence", icon: "Activity" },
  ],
};

function getFleetIntelligenceNavConfig(): NavGroup[] {
  return [
    fleetOperationsGroup,
    implementationGroup,
    fleetAnalyticsGroup,
    { ...administrationGroup, secondary: false },
    fleetSetupGroup,
    cmmsAssetsGroup,
  ];
}

function getHybridNavConfig(): NavGroup[] {
  return [
    {
      ...fleetOperationsGroup,
      items: [...fleetOperationsGroup.items, ...fleetOperationsHybridExtras],
    },
    implementationGroup,
    {
      ...fleetAnalyticsGroup,
      items: [{ label: "Reports", href: "/reports", icon: "BarChart2" }],
    },
    { ...administrationGroup, secondary: false },
    fleetSetupGroup,
    hybridCmmsOperationsGroup,
    cmmsAssetsGroup,
  ];
}

function getCmmsNavConfig(): NavGroup[] {
  return [
    cmmsOperationsGroup,
    cmmsAnalyticsGroup,
    administrationGroup,
    cmmsAssetsExpandedGroup,
    cmmsPeopleGroup,
    cmmsSupplyGroup,
  ];
}

export function getNavConfig(productProfile: ProductProfile = "cmms"): NavGroup[] {
  if (productProfile === "fleet_intelligence") {
    return getFleetIntelligenceNavConfig();
  }
  if (productProfile === "hybrid") {
    return getHybridNavConfig();
  }
  return getCmmsNavConfig();
}

/** @deprecated Use getNavConfig(productProfile) — kept for gradual migration */
export const navConfig: NavGroup[] = getCmmsNavConfig();

export function isFleetProductProfile(productProfile: ProductProfile): boolean {
  return productProfile === "fleet_intelligence" || productProfile === "hybrid";
}

/** Determines whether a nav item should render as active. */
export function isNavItemActive(
  item: NavItem,
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  const [pathPart, queryPart] = item.href.split("?");
  const path = pathPart || item.href;

  if (path === "/operations") {
    if (pathname !== "/operations") return false;
    const focus = searchParams.get("focus");
    if (queryPart?.includes("focus=recommendations")) {
      return focus === "recommendations";
    }
    if (queryPart?.includes("focus=exceptions")) {
      return focus === "exceptions";
    }
    return !focus || focus === "";
  }

  if (path === "/settings/integrations") {
    if (!pathname.startsWith("/settings/integrations")) return false;
    const focus = searchParams.get("focus");
    if (queryPart?.includes("focus=webhooks")) {
      return focus === "webhooks";
    }
    return focus !== "webhooks";
  }

  if (path === "/operations") return pathname === "/operations";
  if (path === "/dispatch") return pathname === "/dispatch" || pathname.startsWith("/dispatch/");
  if (path === "/reports/operations") {
    return pathname === "/reports/operations" || pathname.startsWith("/reports/operations/");
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}
