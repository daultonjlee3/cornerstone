import type { TourConfig } from "./types";

/**
 * Four-step action-only demo: real navigation and completion—no passive Next/Back.
 * Advances on route changes + work-order completion event.
 */
export const demoGuidedTourConfig: TourConfig = {
  id: "demo-guided",
  name: "Guided workflow demo",
  path: "/operations",
  autoStart: false,
  steps: [
    {
      id: "priority-plan",
      path: "/operations",
      title: "Run Today's Maintenance Plan",
      content: "",
      actionCta: "Open Priority Work Order",
      hideNext: true,
    },
    {
      id: "urgent-wo-row",
      path: "/work-orders",
      title: "This is what your tech sees",
      content: "",
      actionCta: "Open Work Order",
      hideNext: true,
    },
    {
      id: "complete-work",
      path: "/work-orders",
      title: "Complete the job",
      content: "",
      actionCta: "Mark Complete",
      hideNext: true,
    },
    {
      id: "trial-cta",
      path: "/operations",
      title: "Your operations just updated",
      content: "",
      actionCta: "Start Free Trial",
      variant: "cta",
    },
  ],
};

export const tourConfigs: TourConfig[] = [
  {
    id: "dashboard",
    name: "Operations Center",
    path: "/operations",
    autoStart: false,
    steps: [
      {
        id: "overview",
        title: "Operations overview",
        content:
          "Open, overdue, and scheduled work in one place. Workload and issues at a glance.",
      },
      {
        id: "metrics",
        title: "Metrics",
        content:
          "Open work orders, in progress, completed today, overdue, active technicians. Prioritize and balance from here.",
      },
      {
        id: "urgent",
        title: "Urgent work",
        content:
          "Overdue work, high-priority not started, PM due soon, repeated failures, low stock. Act first on what matters.",
      },
      {
        id: "quick-actions",
        title: "Quick actions",
        content:
          "Reports, dispatch, work orders. One click to where the work is.",
      },
    ],
  },
  {
    id: "assets",
    name: "Assets",
    path: "/assets",
    steps: [
      {
        id: "asset-list",
        title: "Asset list",
        content:
          "All equipment and systems are listed here. Filter and search to find assets by location, type, or name.",
      },
      {
        id: "asset-detail",
        title: "Asset detail",
        content:
          "Open an asset to see its info, location, condition, and linked work orders. Use this to plan maintenance and track history.",
      },
      {
        id: "maintenance-history",
        title: "Maintenance history",
        content:
          "Past work orders and PM runs show how often an asset is serviced and any recurring issues. Use this for reliability and scheduling.",
      },
      {
        id: "create-wo",
        title: "Creating work orders",
        content:
          "From an asset you can create a work order directly so the job is already linked to the right equipment.",
      },
      {
        id: "schedule-pm",
        title: "Scheduling preventive maintenance",
        content:
          "Schedule recurring PM from an asset or from the Preventive Maintenance module. The system can auto-generate work orders when due.",
      },
    ],
  },
  {
    id: "work-orders",
    name: "Work Orders",
    path: "/work-orders",
    steps: [
      {
        id: "statuses",
        title: "Statuses",
        content:
          "Work orders move through statuses: New → Ready to schedule → Scheduled → In progress → Completed. Use filters to see by status or priority.",
      },
      {
        id: "assignment",
        title: "Assignment",
        content:
          "Assign jobs to technicians, crews, or vendors. Assignment and due dates drive the dispatch board and technician queue.",
      },
      {
        id: "scheduling",
        title: "Scheduling",
        content:
          "Set scheduled date and optional time windows. Scheduled work appears on the dispatch board for drag-and-drop assignment.",
      },
      {
        id: "completion",
        title: "Completion workflow",
        content:
          "Mark work orders complete when the job is done. Add completion notes and labor; parts used are tracked for inventory.",
      },
    ],
  },
  {
    id: "dispatch",
    name: "Dispatch",
    path: "/dispatch",
    steps: [
      {
        id: "technician-columns",
        title: "Technician columns",
        content:
          "Each column is a technician or crew. This board shows today’s workload per person so you can balance assignments.",
      },
      {
        id: "drag-drop",
        title: "Drag and drop scheduling",
        content:
          "Drag work order cards into a column to assign them. Move cards between columns to reassign. Changes save automatically.",
      },
      {
        id: "workload",
        title: "Workload balancing",
        content:
          "Use the counts and suggested rebalancing to spread work evenly. Avoid overloading one technician while others have capacity.",
      },
      {
        id: "routing",
        title: "Routing and maps",
        content:
          "Use the map view to see job locations and plan routes. Optimize the order of stops for each technician when needed.",
      },
    ],
  },
  {
    id: "preventive-maintenance",
    name: "Preventive Maintenance",
    path: "/preventive-maintenance",
    steps: [
      {
        id: "pm-schedules",
        title: "PM schedules",
        content:
          "PM plans define recurring service (e.g. monthly inspection, quarterly filter change). Each plan is tied to an asset and frequency.",
      },
      {
        id: "recurrence",
        title: "Recurrence",
        content:
          "Set frequency (daily, weekly, monthly, yearly) and interval. Next run date is calculated automatically after each completion.",
      },
      {
        id: "generated-wo",
        title: "Generated work orders",
        content:
          "When a PM run is due, the system can auto-create a work order. You can also create work orders manually from the plan.",
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    path: "/inventory",
    steps: [
      {
        id: "products",
        title: "Products",
        content:
          "Products are parts and materials you track. They’re used in work orders and purchase orders and live in stock locations.",
      },
      {
        id: "stock-locations",
        title: "Stock locations",
        content:
          "Warehouses, trucks, and site lockers are stock locations. Each product can have balances in multiple locations.",
      },
      {
        id: "balances",
        title: "Inventory balances",
        content:
          "Balances show quantity on hand per product per location. Set reorder points to get low-stock alerts on the dashboard.",
      },
      {
        id: "transactions",
        title: "Inventory transactions",
        content:
          "Adjustments, receipts from purchase orders, and parts used on work orders create transactions. Full history is audited here.",
      },
    ],
  },
  {
    id: "purchase-orders",
    name: "Purchase Orders",
    path: "/purchase-orders",
    steps: [
      {
        id: "ordering",
        title: "Ordering parts",
        content:
          "Create a purchase order, add lines for products and quantities, then submit. Vendors and delivery dates are tracked here.",
      },
      {
        id: "receiving",
        title: "Receiving inventory",
        content:
          "When goods arrive, receive against the PO. Quantities are added to the chosen stock location and inventory transactions are created.",
      },
    ],
  },
  demoGuidedTourConfig,
];

/** Get tour config for a pathname. Uses exact match first, then path prefix. Skips tours with autoStart: false. */
export function getTourForPath(pathname: string): TourConfig | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const autoStartable = tourConfigs.filter((t) => t.autoStart !== false);
  const exact = autoStartable.find((t) => {
    const p = t.path.replace(/\/$/, "") || "/";
    return p === normalized;
  });
  if (exact) return exact;
  const prefix = autoStartable.find((t) => {
    const p = t.path.replace(/\/$/, "") || "/";
    return p !== "/" && normalized.startsWith(p);
  });
  return prefix ?? null;
}
