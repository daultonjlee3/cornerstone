import type { GuidanceTour } from "./types";

export const onboardingGuides: GuidanceTour[] = [
  {
    id: "onboarding-create-asset",
    name: "Onboarding: Create Asset",
    layer: "onboarding-guide",
    routePrefix: "/assets",
    allowReplay: true,
    steps: [
      {
        id: "asset-list",
        title: "Assets Workspace",
        content: "This is where your equipment registry lives.",
        selector: '[data-tour="assets:asset-list"]',
      },
      {
        id: "create-asset",
        title: "Create Your First Asset",
        content: "Create an asset to start linking maintenance activity to equipment.",
        selector: '[data-get-started="create-asset"]',
      },
    ],
  },
  {
    id: "onboarding-create-work-order",
    name: "Onboarding: Create Work Order",
    layer: "onboarding-guide",
    routePrefix: "/work-orders",
    allowReplay: true,
    steps: [
      {
        id: "statuses",
        title: "Work Order Pipeline",
        content: "Track work from new to completed in one system.",
        selector: '[data-tour="work-orders:statuses"]',
      },
      {
        id: "scheduling",
        title: "Schedule Work",
        content: "Set schedule details so dispatch can execute reliably.",
        selector: '[data-tour="work-orders:scheduling"]',
      },
    ],
  },
  {
    id: "onboarding-assign-technician",
    name: "Onboarding: Assign Technician",
    layer: "onboarding-guide",
    routePrefix: "/dispatch",
    allowReplay: true,
    steps: [
      {
        id: "columns",
        title: "Technician Lanes",
        content: "Use lane capacity to keep workloads balanced.",
        selector: '[data-tour="dispatch:technician-columns"]',
      },
      {
        id: "drag-drop",
        title: "Assign via Drag and Drop",
        content: "Drop a work order onto a lane to assign instantly.",
        selector: '[data-tour="dispatch:drag-drop"]',
      },
    ],
  },
  {
    id: "onboarding-complete-work-order",
    name: "Onboarding: Complete Work Order",
    layer: "onboarding-guide",
    routePrefix: "/work-orders",
    allowReplay: true,
    steps: [
      {
        id: "completion",
        title: "Complete Work",
        content: "Capture completion details to close the loop and build history.",
        selector: '[data-tour="work-orders:completion"]',
      },
    ],
  },
];
