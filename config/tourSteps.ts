/**
 * Sidebar-focused guided product tour step configuration.
 * Each step targets a sidebar navigation item via data-tour attribute.
 */

export type SidebarTourStep = {
  /** CSS selector targeting the sidebar navigation item. */
  target: string;
  title: string;
  content: string;
};

export const sidebarTourSteps: SidebarTourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Operations Dashboard",
    content:
      "Track maintenance backlog, technician workload, and operational KPIs.",
  },
  {
    target: "[data-tour='work-orders']",
    title: "Work Orders",
    content:
      "Create, assign, and track maintenance jobs from request to completion.",
  },
  {
    target: "[data-tour='preventive-maintenance']",
    title: "Preventive Maintenance",
    content:
      "Automate recurring maintenance schedules to prevent equipment failures.",
  },
  {
    target: "[data-tour='assets']",
    title: "Assets",
    content: "Maintain service history and track equipment reliability.",
  },
  {
    target: "[data-tour='dispatch']",
    title: "Dispatch",
    content: "Assign technicians and manage daily maintenance operations.",
  },
  {
    target: "[data-tour='inventory']",
    title: "Inventory",
    content: "Track parts and materials across maintenance locations.",
  },
  {
    target: "[data-tour='vendors']",
    title: "Vendors",
    content: "Maintain supplier relationships and vendor records.",
  },
  {
    target: "[data-tour='purchase-orders']",
    title: "Purchase Orders",
    content: "Create and track purchase orders tied to maintenance materials.",
  },
  {
    target: "[data-tour='operations-intelligence']",
    title: "Operations Intelligence",
    content: "Analyze maintenance performance and operational trends.",
  },
];

export const TOUR_COMPLETED_KEY = "cornerstone_demo_tour_completed";
export const TOUR_TOTAL_STEPS = sidebarTourSteps.length;
