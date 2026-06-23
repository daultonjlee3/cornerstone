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
  label: string;
  items: NavItem[];
  /** When true, section is visually de-emphasized (secondary). */
  secondary?: boolean;
};

const adminItems: NavItem[] = [
  { label: "Companies", href: "/companies", icon: "Building" },
  { label: "Onboarding Wizard", href: "/onboarding-wizard", icon: "Sparkles" },
  { label: "Customers", href: "/customers", icon: "UserCircle" },
  { label: "Contracts", href: "/dashboard/contracts", icon: "FileText" },
  { label: "Invoices", href: "/dashboard/invoices", icon: "Receipt" },
];

function isAdminItemEnabled(item: NavItem): boolean {
  if (item.href === "/customers") return featureFlags.customers;
  if (item.href === "/dashboard/contracts") return featureFlags.contracts;
  if (item.href === "/dashboard/invoices") return featureFlags.invoicing;
  return true;
}

const baseNavConfig: NavGroup[] = [
  {
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
  },
  {
    label: "Assets",
    secondary: true,
    items: [
      { label: "Assets", href: "/assets", icon: "Box" },
      { label: "Preventive Maintenance", href: "/preventive-maintenance", icon: "CalendarCheck" },
      { label: "Properties", href: "/properties", icon: "MapPin" },
      { label: "Buildings", href: "/buildings", icon: "Building2" },
      { label: "Units", href: "/units", icon: "Layers" },
    ],
  },
  {
    label: "People",
    secondary: true,
    items: [
      { label: "Technicians", href: "/technicians", icon: "Users" },
      { label: "Crews", href: "/crews", icon: "UsersRound" },
    ],
  },
  {
    label: "Supply",
    secondary: true,
    items: [
      { label: "Inventory", href: "/inventory", icon: "Warehouse" },
      { label: "Products", href: "/products", icon: "Package" },
      { label: "Vendors", href: "/vendors", icon: "Store" },
      { label: "Purchase Orders", href: "/purchase-orders", icon: "ShoppingCart" },
    ],
  },
  {
    label: "Analytics",
    secondary: true,
    items: [
      { label: "Reports", href: "/reports", icon: "BarChart2" },
      { label: "Operations Intelligence", href: "/reports/operations", icon: "BarChart2" },
    ],
  },
  {
    label: "Admin",
    secondary: true,
    items: adminItems.filter(isAdminItemEnabled),
  },
  {
    label: "Organization",
    secondary: true,
    items: [{ label: "Settings", href: "/settings", icon: "Settings" }],
  },
];

const fleetNavGroup: NavGroup = {
  label: "Fleet",
  items: [
    { label: "Branches", href: "/branches", icon: "Warehouse" },
    { label: "Trucks", href: "/fleet/trucks", icon: "Package" },
    { label: "Jobs", href: "/fleet/jobs", icon: "ClipboardList" },
    { label: "Sites", href: "/fleet/sites", icon: "MapPin" },
    { label: "Operators", href: "/fleet/operators", icon: "Users" },
  ],
};

export function getNavConfig(productProfile: ProductProfile = "cmms"): NavGroup[] {
  const showFleet = productProfile === "fleet_intelligence" || productProfile === "hybrid";
  if (!showFleet) return baseNavConfig;

  const groups = [...baseNavConfig];
  groups.splice(1, 0, fleetNavGroup);
  return groups;
}

/** @deprecated Use getNavConfig(productProfile) — kept for gradual migration */
export const navConfig: NavGroup[] = baseNavConfig;

export function isFleetProductProfile(productProfile: ProductProfile): boolean {
  return productProfile === "fleet_intelligence" || productProfile === "hybrid";
}
