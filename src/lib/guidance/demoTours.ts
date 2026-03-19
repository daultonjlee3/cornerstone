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
        title: "You are in Demo Workspace",
        content: "This banner confirms you are in a safe demo environment with isolated sample behavior.",
        selector: '[data-tour="demo:banner"]',
      },
      {
        id: "command-center",
        title: "Operations Center",
        content: "See open, overdue, and scheduled work in one command view.",
        selector: '[data-tour="demo-guided:command-center"]',
      },
      {
        id: "metrics",
        title: "Core Metrics",
        content: "Track open, in-progress, completed, and overdue work at a glance.",
        selector: '[data-tour="dashboard:metrics"]',
      },
      {
        id: "urgent-work",
        title: "Urgent Work Focus",
        content: "Prioritize high-risk and overdue tasks from one focused panel.",
        selector: '[data-tour="dashboard:urgent"]',
      },
    ],
  },
];
