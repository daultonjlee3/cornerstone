import type { TourConfig } from "./types";

/** 6-step guided demo tour: workflow narrative across dashboard → work orders → dispatch → execution → completion → assets. */
export const demoGuidedTourConfig: TourConfig = {
  id: "demo-guided",
  name: "2-Minute Guided Tour",
  path: "/dashboard",
  autoStart: false,
  steps: [
    {
      id: "command-center",
      path: "/dashboard",
      title: "Your maintenance operation, in one place",
      content:
        "The Command Center gives you real-time visibility into open work orders, technician activity, overdue work, and scheduled maintenance.",
      cta: "Next: See how work starts",
    },
    {
      id: "work-orders",
      path: "/work-orders",
      title: "Every job starts as a work order",
      content:
        "Track maintenance requests from creation through completion. Work orders help your team stay organized, accountable, and on schedule.",
      cta: "Next: Dispatch the right technician",
    },
    {
      id: "dispatch",
      path: "/dispatch",
      title: "Dispatch the right technician at the right time",
      content:
        "Assign work, manage schedules, and keep field teams moving efficiently with full visibility into the day's workload.",
      cta: "Next: See the technician workflow",
    },
    {
      id: "execution",
      path: "/work-orders",
      title: "Technicians get the context they need to execute",
      content:
        "Each work order gives technicians the job details, asset context, history, and updates they need to complete work efficiently.",
      cta: "Next: Track completion automatically",
    },
    {
      id: "completion",
      path: "/work-orders",
      title: "Completion updates the system automatically",
      content:
        "As work is completed, status changes, timestamps, and activity logs are captured for operational visibility and accountability.",
      cta: "Next: Build asset history",
    },
    {
      id: "asset-history",
      path: "/assets",
      title: "Every completed job builds asset history",
      content:
        "Cornerstone helps teams track maintenance history, equipment performance, and service trends so they can make smarter decisions over time.",
      cta: "Finish Tour",
    },
  ],
};

export const tourConfigs: TourConfig[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    path: "/dashboard",
    steps: [
      {
        id: "overview",
        title: "Operations overview",
        content:
          "This is your operations command center. Key metrics and alerts are summarized here so you can see workload and issues at a glance.",
      },
      {
        id: "metrics",
        title: "Metrics",
        content:
          "These cards show open work orders, in-progress jobs, completed today, overdue count, and active technicians. Use them to prioritize and balance workload.",
      },
      {
        id: "urgent",
        title: "Urgent work",
        content:
          "Operational alerts highlight overdue work orders, high-priority jobs not started, PM due soon, repeated failures, and low stock. Act on these first.",
      },
      {
        id: "quick-actions",
        title: "Quick actions",
        content:
          "Jump to reports, open the dispatch board to schedule field work, or go straight to the work order list to triage and assign tasks.",
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
