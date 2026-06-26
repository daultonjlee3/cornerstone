/** Staged demo scenarios — deterministic truck unit numbers (PT-1001 … PT-1024) */

export const DEMO_UNIT_PREFIX = "PT-";

export const STAGED_PM_UNITS = ["1021", "1018", "1024"] as const;
export const STAGED_GPS_OFFLINE_UNITS = ["1023"] as const;
export const STAGED_GPS_STALE_UNITS = ["1015", "1029"] as const;

export type StagedUnassignedJob = {
  unitIndex: number;
  title: string;
  jobType: string;
  priority: "urgent" | "high";
  truckType: string;
  revenue: number;
  branchCode: string;
  siteIndex: number;
  hourET: number;
  estHours: number;
  emergency?: boolean;
};

/** High-quality unassigned jobs on demo day — engine should recommend available trucks */
export const STAGED_UNASSIGNED_JOBS: StagedUnassignedJob[] = [
  {
    unitIndex: 0,
    title: "Georgia Power — utility daylighting corridor",
    jobType: "Utility daylighting",
    priority: "urgent",
    truckType: "hydrovac",
    revenue: 9800,
    branchCode: "ATN",
    siteIndex: 8,
    hourET: 8,
    estHours: 6,
  },
  {
    unitIndex: 1,
    title: "Atlanta Logistics Yard — industrial vacuum service",
    jobType: "Industrial vacuum service",
    priority: "urgent",
    truckType: "vacuum",
    revenue: 7200,
    branchCode: "ATS",
    siteIndex: 4,
    hourET: 9,
    estHours: 5,
  },
  {
    unitIndex: 2,
    title: "Storm drain cleaning — I-85 utility corridor",
    jobType: "Storm drain cleaning",
    priority: "high",
    truckType: "vacuum",
    revenue: 5400,
    branchCode: "ATN",
    siteIndex: 10,
    hourET: 10,
    estHours: 4,
  },
  {
    unitIndex: 3,
    title: "Plant shutdown cleaning — Line 4 turnaround",
    jobType: "Plant shutdown cleaning",
    priority: "urgent",
    truckType: "hydrovac",
    revenue: 11200,
    branchCode: "MAC",
    siteIndex: 20,
    hourET: 7,
    estHours: 8,
  },
  {
    unitIndex: 4,
    title: "Emergency environmental response — containment berm",
    jobType: "Emergency response",
    priority: "urgent",
    truckType: "hydrovac",
    revenue: 8600,
    branchCode: "SAV",
    siteIndex: 28,
    hourET: 11,
    estHours: 6,
    emergency: true,
  },
  {
    unitIndex: 5,
    title: "Trench support — fiber backbone segment",
    jobType: "Trench support",
    priority: "high",
    truckType: "hydrovac",
    revenue: 6100,
    branchCode: "ATS",
    siteIndex: 9,
    hourET: 13,
    estHours: 5,
  },
];

/** Trucks that should appear in recommendations (available, online, no PM) */
export const STAGED_RECOMMENDED_UNITS = ["1004", "1012", "1028", "1007", "1019"] as const;
