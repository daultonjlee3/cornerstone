export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navConfig: NavGroup[] = [
  {
    label: "Core Structure",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Onboarding Wizard", href: "/onboarding-wizard" },
      { label: "Operations Center", href: "/operations" },
      { label: "Companies", href: "/companies" },
      { label: "Properties", href: "/properties" },
      { label: "Buildings", href: "/buildings" },
      { label: "Units", href: "/units" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Work Orders", href: "/work-orders" },
      { label: "Work Requests", href: "/requests" },
      { label: "Request Portal", href: "/request" },
      { label: "Assets", href: "/assets" },
      { label: "Asset Intelligence", href: "/assets/intelligence" },
      { label: "Technicians", href: "/technicians" },
      { label: "Technician Work Queue", href: "/technicians/work-queue" },
      { label: "Technician Portal", href: "/portal" },
      { label: "Crews", href: "/crews" },
      { label: "Dispatch", href: "/dispatch" },
      { label: "Preventive Maintenance", href: "/preventive-maintenance" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Customers", href: "/customers" },
      { label: "Vendors", href: "/vendors" },
      { label: "Products", href: "/products" },
      { label: "Inventory", href: "/inventory" },
      { label: "Purchase Orders", href: "/purchase-orders" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Contracts", href: "/dashboard/contracts" },
      { label: "Invoices", href: "/dashboard/invoices" },
    ],
  },
];
