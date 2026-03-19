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
        id: "command-center",
        title: "Operations Center",
        content: "See open, overdue, and scheduled work in one command view.",
        selector: '[data-tour="demo-guided:command-center"]',
      },
      {
        id: "work-orders",
        title: "Work Orders",
        content: "Track each request from intake through execution and completion.",
        selector: '[data-tour="demo-guided:work-orders"]',
        route: "/work-orders",
      },
      {
        id: "dispatch",
        title: "Dispatch",
        content: "Assign work quickly and balance workload across technicians.",
        selector: '[data-tour="demo-guided:dispatch"]',
        route: "/dispatch",
      },
      {
        id: "technician-queue",
        title: "Technician Queue",
        content: "Field teams work from a focused queue with live status updates.",
        selector: '[data-tour="demo-guided:technician-execution"]',
        route: "/technicians/work-queue",
      },
      {
        id: "asset-intelligence",
        title: "Asset Intelligence",
        content: "Work history becomes insight for reliability and planning.",
        selector: '[data-tour="demo-guided:asset-intelligence"]',
        route: "/assets/intelligence",
      },
    ],
  },
];
