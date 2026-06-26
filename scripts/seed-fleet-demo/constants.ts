/** Peachtree Industrial Services — golden demo tenant (20+ year GA industrial operator) */

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
  foundedYear: 2003,
  tagline: "Industrial vacuum, hydrovac, and plant services across Georgia since 2003.",
};

/** Primary dispatch board date for demos (tomorrow) */
export const DEMO_DAY_OFFSET = 1;

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
  targetUtilization: number;
  truckCount: number;
  operatorCount: number;
};

export const BRANCHES: BranchDef[] = [
  {
    code: "ATN",
    name: "Atlanta North",
    city: "Marietta",
    state: "GA",
    address: "2850 Cobb Parkway SE",
    postalCode: "30067",
    latitude: 33.9526,
    longitude: -84.5499,
    timezone: "America/New_York",
    targetUtilization: 0.91,
    truckCount: 6,
    operatorCount: 8,
  },
  {
    code: "ATS",
    name: "Atlanta South",
    city: "McDonough",
    state: "GA",
    address: "1200 Jodeco Road",
    postalCode: "30253",
    latitude: 33.4512,
    longitude: -84.1388,
    timezone: "America/New_York",
    targetUtilization: 1.06,
    truckCount: 6,
    operatorCount: 8,
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
    targetUtilization: 0.78,
    truckCount: 5,
    operatorCount: 6,
  },
  {
    code: "SAV",
    name: "Savannah",
    city: "Savannah",
    state: "GA",
    address: "1100 Gulfstream Industrial Park",
    postalCode: "31408",
    latitude: 32.1201,
    longitude: -81.2032,
    timezone: "America/New_York",
    targetUtilization: 0.72,
    truckCount: 4,
    operatorCount: 5,
  },
  {
    code: "AUG",
    name: "Augusta",
    city: "Augusta",
    state: "GA",
    address: "2200 Stevens Creek Industrial Dr",
    postalCode: "30907",
    latitude: 33.5207,
    longitude: -82.0851,
    timezone: "America/New_York",
    targetUtilization: 0.68,
    truckCount: 3,
    operatorCount: 5,
  },
];

export const TRUCK_TYPES = [
  { type: "hydrovac", weight: 0.38, gallons: 3200 },
  { type: "vacuum", weight: 0.22, gallons: 2800 },
  { type: "combo", weight: 0.12, gallons: 3500 },
  { type: "jet_vac", weight: 0.08, gallons: 2600 },
  { type: "water_truck", weight: 0.08, gallons: 4000 },
  { type: "support", weight: 0.07, gallons: 0 },
  { type: "service_pickup", weight: 0.05, gallons: 0 },
] as const;

export const JOB_TYPES = [
  "Hydrovac excavation",
  "Utility daylighting",
  "Storm drain cleaning",
  "Industrial vacuum service",
  "Sludge removal",
  "Confined space support",
  "Plant shutdown cleaning",
  "Emergency response",
  "Trench support",
  "Tank cleaning",
  "Pipeline support",
  "Environmental cleanup",
  "Municipal maintenance",
  "Vacuum excavation",
] as const;

export const CUSTOMERS = [
  "Georgia Power — North Region",
  "Georgia Power — Coastal Division",
  "Metro Water Authority",
  "Cobb County Water System",
  "Gwinnett County DOT",
  "Turner Heavy Civil",
  "Concrete Supply of Atlanta",
  "Atlanta Logistics Partners",
  "Buford Distribution Center",
  "Norcross Commerce Center",
  "Blue Ridge Manufacturing",
  "KIA Motors Manufacturing Georgia",
  "Gulfstream Aerospace",
  "Port of Savannah Terminals",
  "Augusta Regional Utilities",
  "Fort Eisenhower Support Services",
  "Bibb County Public Works",
  "Cherokee County Utilities",
  "Paulding Industrial Group",
  "McDonough Development Authority",
  "Lawrenceville Pipeline Group",
  "Forsyth Environmental Services",
  "SNF Holding — Chemical Processing",
  "Kraft Heinz — Macon Plant",
  "Graphic Packaging International",
  "Home Depot Supply Chain",
  "Amazon ATL2 Fulfillment",
  "Sysco Southeast Distribution",
  "Nestlé Purina — Hartwell",
  "Southern Company Gas",
  "City of Savannah Public Works",
  "CSX Intermodal — Fairburn",
] as const;

export const SITE_LOCATIONS: Array<{
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
}> = [
  { name: "Georgia Power — Buckhead Substation 47", city: "Atlanta", address: "700 Hammond Dr", latitude: 33.9215, longitude: -84.3789 },
  { name: "Metro Water — Buckhead Pump Station", city: "Atlanta", address: "1200 Piedmont Rd NE", latitude: 33.8087, longitude: -84.3745 },
  { name: "Atlanta Industrial — Westside Plant", city: "Atlanta", address: "600 Marietta St NW", latitude: 33.7712, longitude: -84.4012 },
  { name: "CSX Intermodal — Fairburn Yard", city: "Fairburn", address: "7800 Senoia Rd", latitude: 33.5678, longitude: -84.5812 },
  { name: "Atlanta Logistics — Southside DC", city: "McDonough", address: "1800 Highway 42", latitude: 33.4473, longitude: -84.1469 },
  { name: "Amazon ATL2 — Inbound Dock 12", city: "Locust Grove", address: "6725 Oakley Industrial Blvd", latitude: 33.3521, longitude: -84.1045 },
  { name: "Cobb Water — Terrell Mill Rd", city: "Marietta", address: "950 Terrell Mill Rd", latitude: 33.9178, longitude: -84.5123 },
  { name: "Turner Heavy Civil — I-85 Widening", city: "Lawrenceville", address: "900 Scenic Hwy", latitude: 33.9562, longitude: -83.988 },
  { name: "Georgia Power — Daylighting Corridor A", city: "Sandy Springs", address: "500 Morgan Falls Rd", latitude: 33.9312, longitude: -84.3821 },
  { name: "AT&T — Fiber Trench Segment 12", city: "Duluth", address: "3500 Breckinridge Blvd", latitude: 34.0028, longitude: -84.1446 },
  { name: "Norcross Commerce — Phase 2", city: "Norcross", address: "5500 Oakbrook Pkwy", latitude: 33.9267, longitude: -84.2213 },
  { name: "Concrete Supply — Batch Plant 3", city: "Norcross", address: "6750 Peachtree Industrial Blvd", latitude: 33.9412, longitude: -84.2136 },
  { name: "Buford DC — Loading Dock C", city: "Buford", address: "1600 Satellite Blvd", latitude: 34.1098, longitude: -83.9671 },
  { name: "Alpharetta Tech Park — Building 7", city: "Alpharetta", address: "11600 Haynes Bridge Rd", latitude: 34.0689, longitude: -84.2744 },
  { name: "Roswell — Big Creek Interceptor", city: "Roswell", address: "900 Holcomb Bridge Rd", latitude: 34.0281, longitude: -84.3617 },
  { name: "Gainesville — Queen City Industrial", city: "Gainesville", address: "1200 Queen City Pkwy", latitude: 34.2979, longitude: -83.8247 },
  { name: "Gwinnett DOT — SR-316 Utility Corridor", city: "Lawrenceville", address: "750 Sugarloaf Pkwy", latitude: 33.9789, longitude: -84.0067 },
  { name: "Cherokee Utilities — Holly Springs Rd", city: "Woodstock", address: "200 Main St", latitude: 34.1015, longitude: -84.5193 },
  { name: "Paulding Industrial — Silver Comet Trail", city: "Dallas", address: "890 Industrial Way", latitude: 33.924, longitude: -84.8407 },
  { name: "Douglasville Concrete — Plant Expansion", city: "Douglasville", address: "6800 Stewart Pkwy", latitude: 33.7515, longitude: -84.7477 },
  { name: "Kraft Heinz — Macon Line 4 Shutdown", city: "Macon", address: "4600 Broadway", latitude: 32.8401, longitude: -83.6312 },
  { name: "Bibb County — Water Reclamation Basin", city: "Macon", address: "2500 Riverside Dr", latitude: 32.8512, longitude: -83.6421 },
  { name: "Graphic Packaging — Pulp Tank Farm", city: "Macon", address: "600 Key Rd", latitude: 32.8289, longitude: -83.6588 },
  { name: "SNF — Chemical Processing North", city: "Riceboro", address: "4500 Coastal Hwy", latitude: 31.7421, longitude: -81.4389 },
  { name: "Port of Savannah — Berth 5 Utility", city: "Savannah", address: "1100 Gulfstream Blvd", latitude: 32.1189, longitude: -81.2012 },
  { name: "Gulfstream — Runway Utility Crossing", city: "Savannah", address: "500 Gulfstream Ave", latitude: 32.1278, longitude: -81.2089 },
  { name: "Savannah Public Works — Storm Drain 18", city: "Savannah", address: "2200 Augusta Rd", latitude: 32.0621, longitude: -81.0912 },
  { name: "Nestlé Purina — Hartwell Tank Cleaning", city: "Hartwell", address: "1200 Industrial Park Dr", latitude: 34.3521, longitude: -82.9312 },
  { name: "Augusta Regional — Chiller Plant", city: "Augusta", address: "2200 Stevens Creek Industrial", latitude: 33.5207, longitude: -82.0851 },
  { name: "Fort Eisenhower — Utility Crossing", city: "Augusta", address: "4500 Chamberlain Ave", latitude: 33.4312, longitude: -82.1521 },
  { name: "Southern Company Gas — Valve Cluster 9", city: "Augusta", address: "3100 Washington Rd", latitude: 33.4989, longitude: -82.0812 },
  { name: "Sysco Southeast — Loading Bay 4", city: "Hampton", address: "1200 Logistics Pkwy", latitude: 33.3812, longitude: -84.2912 },
];

export const OPERATOR_FIRST = [
  "Marcus", "DeShawn", "Tyler", "Carlos", "Brandon", "Jamal", "Chris", "Derek",
  "Antonio", "Kevin", "Ryan", "Justin", "Terrance", "Eric", "Brian", "Jason",
  "Michael", "David", "James", "Robert", "William", "Daniel", "Matthew", "Anthony",
  "Joshua", "Andrew", "Joseph", "Thomas", "Charles", "Christopher", "Steven", "Kenneth",
  "Timothy", "Richard", "Donald", "Mark", "Paul", "George", "Edward", "Ronald",
  "Larry", "Jeffrey", "Scott", "Gregory", "Raymond", "Patrick", "Frank", "Dennis",
  "Jerry", "Walter", "Harold", "Douglas", "Henry", "Peter", "Roger",
];

export const OPERATOR_LAST = [
  "Williams", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
  "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
  "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall",
  "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams",
  "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell",
  "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers",
  "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera",
];

export const TOTAL_TRUCKS = 24;
export const TOTAL_OPERATORS = 32;
export const DEMO_DAY_JOB_TARGET = 45;
export const DEMO_DAY_UNASSIGNED_TARGET = 30;
export const MART_HISTORY_DAYS = 90;
