import type { GuidanceTour } from "./types";

export const demoTours: GuidanceTour[] = [
  {
    id: "live-demo-overview",
    name: "Live Demo Overview",
    layer: "live-demo",
    routePrefix: "/operations",
    allowReplay: true,
    steps: [
      {
        id: "demo-banner",
        title: "Demo Workspace",
        content:
          "You are in a safe demo environment with sample data. You can explore freely without affecting a real customer workspace.",
        selector: '[data-tour="demo-banner"]',
        position: "bottom",
      },
      {
        id: "command-center",
        title: "Operations Center",
        content:
          "This is the command center where teams monitor urgent work, overdue items, and daily priorities.",
        selector: '[data-tour="operations-center-title"]',
        position: "bottom",
      },
      {
        id: "work-orders-nav",
        title: "Work Orders",
        content:
          "Work orders are where maintenance is tracked end-to-end, from intake through completion.",
        selector: '[data-tour="nav-work-orders"]',
        position: "right",
      },
      {
        id: "dispatch-nav",
        title: "Dispatch Coordination",
        content:
          "Dispatch helps coordinators assign technicians, balance workload, and keep execution on schedule.",
        selector: '[data-tour="nav-dispatch"]',
        position: "right",
      },
      {
        id: "assets-pm-nav",
        title: "Assets + Preventive Maintenance",
        content:
          "Assets and PM connect work history to reliability, so teams can prevent repeat failures and plan ahead.",
        selector: '[data-tour="nav-preventive-maintenance"]',
        position: "right",
      },
    ],
  },
];
