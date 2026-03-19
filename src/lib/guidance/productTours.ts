import type { GuidanceTour } from "./types";

export const productTours: GuidanceTour[] = [
  {
    id: "product-dashboard",
    name: "Dashboard Tour",
    layer: "product-tour",
    routePrefix: "/operations",
    allowReplay: true,
    steps: [
      {
        id: "overview",
        title: "Operations Overview",
        content: "Start with a full snapshot of your maintenance operation.",
        selector: '[data-tour="dashboard:overview"]',
      },
      {
        id: "metrics",
        title: "KPI Metrics",
        content: "Track open, in-progress, completed, and overdue work quickly.",
        selector: '[data-tour="dashboard:metrics"]',
      },
      {
        id: "urgent",
        title: "Urgent Work",
        content: "Prioritize high-risk and overdue items from one panel.",
        selector: '[data-tour="dashboard:urgent"]',
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        content: "Jump directly to reports, dispatch, or work orders.",
        selector: '[data-tour="dashboard:quick-actions"]',
      },
    ],
  },
  {
    id: "product-work-orders",
    name: "Work Orders Tour",
    layer: "product-tour",
    routePrefix: "/work-orders",
    allowReplay: true,
    steps: [
      {
        id: "statuses",
        title: "Statuses",
        content: "Use statuses to move work from new to completed.",
        selector: '[data-tour="work-orders:statuses"]',
      },
      {
        id: "assignment",
        title: "Assignment",
        content: "Assign work to technicians, crews, or vendors.",
        selector: '[data-tour="work-orders:assignment"]',
      },
      {
        id: "scheduling",
        title: "Scheduling",
        content: "Set scheduled dates and route work to dispatch.",
        selector: '[data-tour="work-orders:scheduling"]',
      },
      {
        id: "completion",
        title: "Completion",
        content: "Close jobs with notes, labor, and completion details.",
        selector: '[data-tour="work-orders:completion"]',
      },
    ],
  },
  {
    id: "product-assets",
    name: "Assets Tour",
    layer: "product-tour",
    routePrefix: "/assets",
    allowReplay: true,
    steps: [
      {
        id: "asset-list",
        title: "Asset List",
        content: "Search and filter assets by type, location, and health.",
        selector: '[data-tour="assets:asset-list"]',
      },
      {
        id: "maintenance-history",
        title: "Maintenance History",
        content: "Use work history to identify recurring failures and trends.",
        selector: '[data-tour="assets:maintenance-history"]',
      },
      {
        id: "schedule-pm",
        title: "Schedule PM",
        content: "Create PM plans directly from the asset workflow.",
        selector: '[data-tour="assets:schedule-pm"]',
      },
    ],
  },
  {
    id: "product-preventive-maintenance",
    name: "Preventive Maintenance Tour",
    layer: "product-tour",
    routePrefix: "/preventive-maintenance",
    allowReplay: true,
    steps: [
      {
        id: "pm-schedules",
        title: "PM Schedules",
        content: "Define recurring plans linked to real assets.",
        selector: '[data-tour="preventive-maintenance:pm-schedules"]',
      },
      {
        id: "recurrence",
        title: "Recurrence Rules",
        content: "Set frequencies and intervals to automate generation.",
        selector: '[data-tour="preventive-maintenance:recurrence"]',
      },
      {
        id: "generated-work-orders",
        title: "Generated Work Orders",
        content: "Auto-generated PM work orders keep execution consistent.",
        selector: '[data-tour="preventive-maintenance:generated-wo"]',
      },
    ],
  },
  {
    id: "product-dispatch",
    name: "Dispatch Tour",
    layer: "product-tour",
    routePrefix: "/dispatch",
    allowReplay: true,
    steps: [
      {
        id: "technician-columns",
        title: "Technician Columns",
        content: "Each lane represents technician capacity for the day.",
        selector: '[data-tour="dispatch:technician-columns"]',
      },
      {
        id: "drag-drop",
        title: "Drag and Drop",
        content: "Assign and rebalance work quickly with drag-and-drop.",
        selector: '[data-tour="dispatch:drag-drop"]',
      },
      {
        id: "routing",
        title: "Map Routing",
        content: "Use route context to reduce travel and delay risk.",
        selector: '[data-tour="dispatch:routing"]',
      },
    ],
  },
  {
    id: "product-requests",
    name: "Requests Tour",
    layer: "product-tour",
    routePrefix: "/requests",
    allowReplay: true,
    steps: [
      {
        id: "header",
        title: "Requests Inbox",
        content: "Review incoming maintenance requests in one queue.",
        selector: '[data-tour="requests:header"]',
      },
      {
        id: "filters",
        title: "Filters",
        content: "Filter by status and search by requester or location.",
        selector: '[data-tour="requests:filters"]',
      },
      {
        id: "table",
        title: "Request Table",
        content: "Approve, reject, or convert requests into work orders.",
        selector: '[data-tour="requests:table"]',
      },
    ],
  },
];
