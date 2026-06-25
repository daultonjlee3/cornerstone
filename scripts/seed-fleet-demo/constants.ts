/** Peachtree Industrial Services — Fleet Intelligence demo tenant */

export const PEACHTREE_TENANT = {
  name: "Peachtree Industrial Services",
  slug: "peachtree-industrial",
  productProfile: "fleet_intelligence" as const,
};

export const PEACHTREE_COMPANY = {
  name: "Peachtree Industrial Services",
  legalName: "Peachtree Industrial Services, LLC",
  addressLine1: "2850 Cobb Parkway SE",
  city: "Marietta",
  state: "GA",
  postalCode: "30067",
  phone: "(770) 555-4800",
  website: "https://peachtreeindustrial.com",
};

export type BranchDef = {
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Target utilization for mart shaping (0-1) */
  targetUtilization: number;
  truckCount: number;
};

export const BRANCHES: BranchDef[] = [
  {
    code: "MAR",
    name: "Marietta HQ",
    city: "Marietta",
    state: "GA",
    address: "2850 Cobb Parkway SE",
    postalCode: "30067",
    latitude: 33.9526,
    longitude: -84.5499,
    timezone: "America/New_York",
    targetUtilization: 0.94,
    truckCount: 16,
  },
  {
    code: "GVL",
    name: "Gainesville",
    city: "Gainesville",
    state: "GA",
    address: "1200 Queen City Parkway",
    postalCode: "30501",
    latitude: 34.2979,
    longitude: -83.8247,
    timezone: "America/New_York",
    targetUtilization: 0.73,
    truckCount: 12,
  },
  {
    code: "MAC",
    name: "Macon",
    city: "Macon",
    state: "GA",
    address: "4500 Industrial Blvd",
    postalCode: "31216",
    latitude: 32.8407,
    longitude: -83.6324,
    timezone: "America/New_York",
    targetUtilization: 0.61,
    truckCount: 10,
  },
];

export const TRUCK_TYPES = [
  { type: "hydrovac", weight: 0.45, gallons: 3200 },
  { type: "vacuum", weight: 0.25, gallons: 2800 },
  { type: "combo", weight: 0.15, gallons: 3500 },
  { type: "jet_vac", weight: 0.1, gallons: 2600 },
  { type: "support", weight: 0.05, gallons: 0 },
] as const;

export const JOB_TYPES = [
  "Hydrovac excavation",
  "Utility daylighting",
  "Vacuum excavation",
  "Storm drain cleaning",
  "Industrial vacuuming",
  "Tank cleaning",
  "Pipeline support",
  "Emergency utility response",
  "Confined space support",
  "Plant shutdown support",
  "Environmental cleanup",
  "Municipal maintenance",
] as const;

export const CUSTOMERS = [
  "Metro Water Authority",
  "Georgia Utility Contractors",
  "North Georgia Aggregates",
  "Atlanta Industrial Services",
  "Peachtree Logistics Center",
  "Blue Ridge Manufacturing",
  "South Metro Utilities",
  "Cobb County Water System",
  "Georgia Power — North Region",
  "AT&T Fiber Construction",
  "Turner Heavy Civil",
  "Concrete Supply of Atlanta",
  "Buford Distribution Center",
  "Alpharetta Tech Park",
  "Roswell Municipal Services",
  "Lawrenceville Pipeline Group",
  "Duluth Industrial Park",
  "Norcross Commerce Center",
  "Cartersville Quarry Operations",
  "Rome Utilities Board",
  "McDonough Development Authority",
  "Athens Regional Medical Campus",
  "Sandy Springs Public Works",
  "Cumming Water Reclamation",
  "Gwinnett County DOT",
  "Cherokee County Utilities",
  "Forsyth Environmental Services",
  "Paulding Industrial Group",
  "Douglasville Concrete Plant",
  "Kennesaw State Facilities",
  "Woodstock Municipal Yard",
  "Snellville Stormwater Division",
  "Decatur Gas Line Services",
  "East Point Utility Maintenance",
  "Hapeville Industrial Complex",
  "Smyrna Fiber Backbone Project",
  "Peachtree City Utility District",
  "Newnan Manufacturing Campus",
] as const;

/** Metro Atlanta + North Georgia site coordinates (spread, not clustered) */
export const SITE_LOCATIONS: Array<{
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
}> = [
  { name: "Metro Water — Buckhead Pump Station", city: "Atlanta", address: "1200 Piedmont Rd NE", latitude: 33.8087, longitude: -84.3745 },
  { name: "Georgia Utility — Alpharetta Yard", city: "Alpharetta", address: "5000 Windward Pkwy", latitude: 34.0754, longitude: -84.2941 },
  { name: "North GA Aggregates — Quarry Pit", city: "Cumming", address: "8900 Bettis Tribble Gap Rd", latitude: 34.2073, longitude: -84.1402 },
  { name: "Atlanta Industrial — Westside Plant", city: "Atlanta", address: "600 Marietta St NW", latitude: 33.7712, longitude: -84.4012 },
  { name: "Peachtree Logistics — DC North", city: "Buford", address: "3200 Gateway Industrial Dr", latitude: 34.1207, longitude: -83.9974 },
  { name: "Blue Ridge Mfg — Assembly Line B", city: "Roswell", address: "150 Mansell Court", latitude: 34.0234, longitude: -84.3615 },
  { name: "South Metro — Clayton Lift Station", city: "McDonough", address: "1800 Highway 42", latitude: 33.4473, longitude: -84.1469 },
  { name: "Cobb Water — Terrell Mill Rd", city: "Marietta", address: "950 Terrell Mill Rd", latitude: 33.9178, longitude: -84.5123 },
  { name: "Georgia Power — Substation 47", city: "Sandy Springs", address: "700 Hammond Dr", latitude: 33.9215, longitude: -84.3789 },
  { name: "AT&T — Fiber Trench Segment 12", city: "Duluth", address: "3500 Breckinridge Blvd", latitude: 34.0028, longitude: -84.1446 },
  { name: "Turner Heavy Civil — I-85 Widening", city: "Lawrenceville", address: "900 Scenic Hwy", latitude: 33.9562, longitude: -83.9880 },
  { name: "Concrete Supply — Batch Plant 3", city: "Norcross", address: "6750 Peachtree Industrial Blvd", latitude: 33.9412, longitude: -84.2136 },
  { name: "Buford DC — Loading Dock C", city: "Buford", address: "1600 Satellite Blvd", latitude: 34.1098, longitude: -83.9671 },
  { name: "Alpharetta Tech Park — Building 7", city: "Alpharetta", address: "11600 Haynes Bridge Rd", latitude: 34.0689, longitude: -84.2744 },
  { name: "Roswell — Big Creek Interceptor", city: "Roswell", address: "900 Holcomb Bridge Rd", latitude: 34.0281, longitude: -84.3617 },
  { name: "Lawrenceville Pipeline — Valve Cluster", city: "Lawrenceville", address: "455 Grayson Hwy", latitude: 33.9568, longitude: -83.9879 },
  { name: "Duluth Industrial — Tank Farm", city: "Duluth", address: "2750 Peachtree Industrial", latitude: 34.0021, longitude: -84.1477 },
  { name: "Norcross Commerce — Phase 2", city: "Norcross", address: "5500 Oakbrook Pkwy", latitude: 33.9267, longitude: -84.2213 },
  { name: "Cartersville Quarry — Haul Road", city: "Cartersville", address: "1000 Cassville White Rd", latitude: 34.1651, longitude: -84.7999 },
  { name: "Rome Utilities — Oostanaula Crossing", city: "Rome", address: "800 Martha Berry Hwy", latitude: 34.2570, longitude: -85.1647 },
  { name: "McDonough Dev — Southbridge Site", city: "McDonough", address: "1200 Jodeco Rd", latitude: 33.4512, longitude: -84.1388 },
  { name: "Athens Regional — Chiller Plant", city: "Athens", address: "1199 Prince Ave", latitude: 33.9519, longitude: -83.3576 },
  { name: "Sandy Springs — Morgan Falls", city: "Sandy Springs", address: "500 Morgan Falls Rd", latitude: 33.9312, longitude: -84.3821 },
  { name: "Cumming Water — Settling Basin", city: "Cumming", address: "100 Main St", latitude: 34.2071, longitude: -84.1402 },
  { name: "Gwinnett DOT — SR-316 Utility Corridor", city: "Lawrenceville", address: "750 Sugarloaf Pkwy", latitude: 33.9789, longitude: -84.0067 },
  { name: "Cherokee Utilities — Holly Springs Rd", city: "Woodstock", address: "200 Main St", latitude: 34.1015, longitude: -84.5193 },
  { name: "Forsyth Environmental — Landfill Cell 4", city: "Cumming", address: "4560 Coal Mountain Dr", latitude: 34.2234, longitude: -84.0987 },
  { name: "Paulding Industrial — Silver Comet Trail", city: "Dallas", address: "890 Industrial Way", latitude: 33.9240, longitude: -84.8407 },
  { name: "Douglasville Concrete — Plant Expansion", city: "Douglasville", address: "6800 Stewart Pkwy", latitude: 33.7515, longitude: -84.7477 },
  { name: "Kennesaw State — Campus Steam Line", city: "Kennesaw", address: "1000 Chastain Rd", latitude: 34.0384, longitude: -84.5831 },
  { name: "Woodstock Municipal — Pump Upgrade", city: "Woodstock", address: "103 Arnold Mill Rd", latitude: 34.1012, longitude: -84.5199 },
  { name: "Snellville Stormwater — Phase 1", city: "Snellville", address: "2342 Oak Rd", latitude: 33.8573, longitude: -84.0196 },
  { name: "Decatur Gas — Main Replacement", city: "Decatur", address: "509 N McDonough St", latitude: 33.7756, longitude: -84.2963 },
  { name: "East Point Utility — Runway Crossing", city: "East Point", address: "3300 North Commerce Dr", latitude: 33.6751, longitude: -84.4394 },
  { name: "Hapeville Industrial — Rail Spur", city: "Hapeville", address: "600 South Central Ave", latitude: 33.6601, longitude: -84.4102 },
  { name: "Smyrna Fiber — Cumberland Gap", city: "Smyrna", address: "2800 Cumberland Blvd SE", latitude: 33.8839, longitude: -84.5144 },
  { name: "Peachtree City — Lake McIntosh", city: "Peachtree City", address: "200 MacDuff Parkway", latitude: 33.3969, longitude: -84.5953 },
  { name: "Newnan Mfg — Line 4 Shutdown", city: "Newnan", address: "900 Greison Trl", latitude: 33.3807, longitude: -84.7997 },
];

export const OPERATOR_FIRST = [
  "Marcus", "DeShawn", "Tyler", "Carlos", "Brandon", "Jamal", "Chris", "Derek",
  "Antonio", "Kevin", "Ryan", "Justin", "Terrance", "Eric", "Brian", "Jason",
  "Michael", "David", "James", "Robert", "William", "Daniel", "Matthew", "Anthony",
  "Joshua", "Andrew", "Joseph", "Thomas", "Charles", "Christopher",
];

export const OPERATOR_LAST = [
  "Williams", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
  "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
  "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall",
  "Allen", "Young", "King", "Wright", "Scott", "Green",
];
