/**
 * Multi-tenant demo seed configuration.
 * Four target markets with realistic names and structure.
 */

export type LocationConfig = {
  propertyName: string;
  buildings: Array<{
    name: string;
    units?: string[];
  }>;
};

export type TechnicianConfig = {
  name: string;
  email: string;
  phone: string;
  trade: string;
};

export type VendorConfig = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
};

export type ProductConfig = {
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  defaultQuantity: number;
  /** Optional default cost; if omitted, a category-based default is used in seed. */
  defaultCost?: number;
  /** Optional reorder point; if omitted, derived from defaultQuantity * 0.35 in seed. */
  reorderPointDefault?: number;
};

export type AssetPatternConfig = {
  namePrefix: string;
  type: string;
  countPerBuilding: number;
};

export type DemoTenantConfig = {
  tenantName: string;
  slug: string;
  companyName: string;
  locations: LocationConfig[];
  technicians: TechnicianConfig[];
  vendors: VendorConfig[];
  products: ProductConfig[];
  assetPatterns: AssetPatternConfig[];
  workOrderTitles: string[];
  requestTitles: string[];
  pmTemplateNames: Array<{ name: string; frequency: "weekly" | "monthly" | "quarterly" }>;
};

export const DEMO_TENANTS: DemoTenantConfig[] = [
  {
    tenantName: "Summit Facility Services",
    slug: "summit-facility-demo",
    companyName: "Summit Facility Services",
    locations: [
      {
        propertyName: "Downtown Office Tower",
        buildings: [
          { name: "Tower A", units: ["Lobby", "Floor 2", "Floor 3", "Floor 4", "Mechanical Room", "Roof"] },
          { name: "Tower B", units: ["Lobby", "Floor 2", "Floor 3", "Parking Garage", "Roof"] },
        ],
      },
      {
        propertyName: "Lakeside Business Park",
        buildings: [
          { name: "Building 100", units: ["Suite 101", "Suite 102", "Suite 103", "Mechanical Room", "Roof"] },
          { name: "Building 200", units: ["Main Floor", "Upper Floor", "Mechanical Room"] },
        ],
      },
      {
        propertyName: "Grand Oaks Retail Plaza",
        buildings: [
          { name: "Retail East", units: ["Store A", "Store B", "Common Area", "Roof"] },
          { name: "Retail West", units: ["Store C", "Back of House", "Mechanical Room"] },
        ],
      },
      {
        propertyName: "Midtown Medical Offices",
        buildings: [
          { name: "Medical Building", units: ["Suite 1", "Suite 2", "Suite 3", "Waiting Area", "Mechanical Room", "Roof"] },
        ],
      },
      {
        propertyName: "Northpoint Corporate Campus",
        buildings: [
          { name: "Campus Center", units: ["Atrium", "Wing A", "Wing B", "Data Center", "Roof"] },
          { name: "Annex", units: ["Ground Floor", "Upper Floor", "Mechanical Room"] },
        ],
      },
    ],
    technicians: [
      { name: "James Wilson", email: "j.wilson@summit-facility.demo", phone: "(555) 201-1001", trade: "HVAC" },
      { name: "Elena Rodriguez", email: "e.rodriguez@summit-facility.demo", phone: "(555) 201-1002", trade: "Electrical" },
      { name: "Marcus Chen", email: "m.chen@summit-facility.demo", phone: "(555) 201-1003", trade: "General Maintenance" },
      { name: "Sarah Mitchell", email: "s.mitchell@summit-facility.demo", phone: "(555) 201-1004", trade: "Plumbing" },
      { name: "David Park", email: "d.park@summit-facility.demo", phone: "(555) 201-1005", trade: "HVAC" },
      { name: "Rachel Torres", email: "r.torres@summit-facility.demo", phone: "(555) 201-1006", trade: "PM Specialist" },
      { name: "Kevin O'Brien", email: "k.obrien@summit-facility.demo", phone: "(555) 201-1007", trade: "Facilities Technician" },
      { name: "Lisa Nguyen", email: "l.nguyen@summit-facility.demo", phone: "(555) 201-1008", trade: "Electrical" },
    ],
    vendors: [
      { name: "Precision HVAC Services", contactName: "Tom Bradley", email: "service@precisionhvac.demo", phone: "(555) 301-1001", serviceType: "HVAC" },
      { name: "Metro Electrical Contractors", contactName: "Susan Lee", email: "dispatch@metroelectric.demo", phone: "(555) 301-1002", serviceType: "Electrical" },
      { name: "Guardian Fire & Safety", contactName: "Mike Foster", email: "inspection@guardianfire.demo", phone: "(555) 301-1003", serviceType: "Fire Safety" },
      { name: "Apex Elevator Services", contactName: "Jennifer Walsh", email: "service@apexelevator.demo", phone: "(555) 301-1004", serviceType: "Elevator" },
      { name: "Commercial Roofing Systems", contactName: "Robert Hayes", email: "estimates@commercialroof.demo", phone: "(555) 301-1005", serviceType: "Roofing" },
      { name: "Plumbing Pros", contactName: "Amanda Cruz", email: "dispatch@plumbingpros.demo", phone: "(555) 301-1006", serviceType: "Plumbing" },
      { name: "Industrial Pump Solutions", contactName: "Chris Morgan", email: "sales@pumpsolutions.demo", phone: "(555) 301-1007", serviceType: "Pump" },
      { name: "24/7 Emergency Mechanical", contactName: "Pat Davis", email: "emergency@24x7mech.demo", phone: "(555) 301-1008", serviceType: "General" },
    ],
    products: [
      { name: "MERV 8 Air Filter 20x20", sku: "FLT-2020-M8", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 48 },
      { name: "MERV 11 Air Filter 24x24", sku: "FLT-2424-M11", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 36 },
      { name: "Fan Belt 3L290", sku: "BLT-3L290", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 24 },
      { name: "Thermostat Module", sku: "THR-MOD", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 18 },
      { name: "Electrical Breaker 20A", sku: "ELC-BRK20", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 30 },
      { name: "LED Panel 2x4", sku: "LED-2X4", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 40 },
      { name: "Pump Seal Assembly", sku: "PMP-SEAL", category: "Plumbing", unitOfMeasure: "ea", defaultQuantity: 16 },
      { name: "Boiler Gasket Kit", sku: "GSK-BOIL", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 12 },
      { name: "Grease Cartridge", sku: "GRS-CART", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 60 },
      { name: "Smoke Detector", sku: "SNS-SMOKE", category: "Fire Safety", unitOfMeasure: "ea", defaultQuantity: 24 },
      { name: "Copper Fitting 1/2 in", sku: "PLB-CP-12", category: "Plumbing", unitOfMeasure: "ea", defaultQuantity: 50 },
      { name: "Condenser Coil Cleaner", sku: "CLN-COIL", category: "HVAC", unitOfMeasure: "gal", defaultQuantity: 20 },
      { name: "Motor Coupling", sku: "MTR-CPL", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 18 },
      { name: "Vibration Sensor", sku: "SNS-VIB", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 20 },
      { name: "Door Lock Cylinder", sku: "SEC-CYL", category: "Security", unitOfMeasure: "ea", defaultQuantity: 15 },
      { name: "Boiler Pressure Gauge", sku: "GSK-GAUGE", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 10 },
      { name: "Air Compressor Oil", sku: "LUB-COMP", category: "Mechanical", unitOfMeasure: "qt", defaultQuantity: 24 },
      { name: "Filter Drier", sku: "HVAC-DRIER", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 12 },
      { name: "Capacitor 40/5", sku: "ELC-CAP405", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 20 },
      { name: "Ballast T8", sku: "LGT-BAL-T8", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 35 },
    ],
    assetPatterns: [
      { namePrefix: "RTU", type: "HVAC", countPerBuilding: 2 },
      { namePrefix: "AHU", type: "HVAC", countPerBuilding: 1 },
      { namePrefix: "Boiler", type: "Boiler", countPerBuilding: 1 },
      { namePrefix: "Electrical Panel", type: "Electrical", countPerBuilding: 2 },
      { namePrefix: "Elevator", type: "Elevator", countPerBuilding: 1 },
      { namePrefix: "Exhaust Fan", type: "Fan", countPerBuilding: 2 },
      { namePrefix: "Pump", type: "Pump", countPerBuilding: 1 },
      { namePrefix: "Lighting Panel", type: "Lighting", countPerBuilding: 1 },
      { namePrefix: "Fire Panel", type: "Fire Safety", countPerBuilding: 1 },
    ],
    workOrderTitles: [
      "HVAC not cooling in suite",
      "Lighting outage in corridor",
      "Elevator inspection due",
      "Restroom plumbing leak",
      "Replace rooftop unit filter",
      "Thermostat calibration",
      "Boiler pressure check",
      "Exhaust fan bearing noise",
      "Electrical panel inspection",
      "Pump seal replacement",
      "Fire alarm test",
      "Filter replacement - AHU",
    ],
    requestTitles: [
      "Conference room too warm",
      "Bathroom sink leaking",
      "Lights out in hallway",
      "Temperature too cold in office",
      "Door lock malfunction",
      "Noise from rooftop unit",
    ],
    pmTemplateNames: [
      { name: "Monthly HVAC filter inspection", frequency: "monthly" },
      { name: "Quarterly fire alarm test", frequency: "quarterly" },
      { name: "Weekly generator test", frequency: "weekly" },
      { name: "Quarterly elevator safety inspection", frequency: "quarterly" },
      { name: "Monthly boiler pressure check", frequency: "monthly" },
    ],
  },
  {
    tenantName: "Northstar Industrial Manufacturing",
    slug: "northstar-manufacturing-demo",
    companyName: "Northstar Industrial Manufacturing",
    locations: [
      {
        propertyName: "Plant A",
        buildings: [
          { name: "Production Floor", units: ["Line 1", "Line 2", "Line 3", "Electrical Room", "Roof"] },
          { name: "Support Building", units: ["Compressor Room", "Maintenance Cage", "Loading Dock"] },
        ],
      },
      {
        propertyName: "Plant B",
        buildings: [
          { name: "Manufacturing", units: ["Assembly", "Fabrication", "Electrical Room", "Roof"] },
          { name: "Warehouse", units: ["Receiving", "Shipping", "Storage"] },
        ],
      },
      {
        propertyName: "Distribution Warehouse",
        buildings: [
          { name: "Main Warehouse", units: ["Dock A", "Dock B", "Office", "Mechanical Room"] },
        ],
      },
      {
        propertyName: "Machine Shop",
        buildings: [
          { name: "Shop Building", units: ["CNC Area", "Tool Room", "Compressor Room", "Electrical Room"] },
        ],
      },
      {
        propertyName: "Operations Center",
        buildings: [
          { name: "Admin Building", units: ["Office", "Data Center", "Mechanical Room", "Roof"] },
        ],
      },
    ],
    technicians: [
      { name: "Carlos Mendez", email: "c.mendez@northstar.demo", phone: "(555) 202-2001", trade: "Mechanical" },
      { name: "Anna Kowalski", email: "a.kowalski@northstar.demo", phone: "(555) 202-2002", trade: "Electrical" },
      { name: "James Liu", email: "j.liu@northstar.demo", phone: "(555) 202-2003", trade: "HVAC" },
      { name: "Maria Santos", email: "m.santos@northstar.demo", phone: "(555) 202-2004", trade: "General Maintenance" },
      { name: "Robert Johnson", email: "r.johnson@northstar.demo", phone: "(555) 202-2005", trade: "Mechanical" },
      { name: "Yuki Tanaka", email: "y.tanaka@northstar.demo", phone: "(555) 202-2006", trade: "PM Specialist" },
      { name: "Derek Williams", email: "d.williams@northstar.demo", phone: "(555) 202-2007", trade: "Facilities Technician" },
      { name: "Nina Patel", email: "n.patel@northstar.demo", phone: "(555) 202-2008", trade: "Electrical" },
      { name: "Omar Hassan", email: "o.hassan@northstar.demo", phone: "(555) 202-2009", trade: "Plumbing" },
    ],
    vendors: [
      { name: "Industrial Pump Solutions", contactName: "Frank Miller", email: "sales@indpumps.demo", phone: "(555) 302-2001", serviceType: "Pump" },
      { name: "Precision HVAC Services", contactName: "Laura Kim", email: "service@precisionhvac.demo", phone: "(555) 302-2002", serviceType: "HVAC" },
      { name: "Metro Electrical Contractors", contactName: "Steve Brown", email: "dispatch@metroelectric.demo", phone: "(555) 302-2003", serviceType: "Electrical" },
      { name: "Conveyor Systems Inc", contactName: "Dave Wilson", email: "service@conveyorsys.demo", phone: "(555) 302-2004", serviceType: "Conveyor" },
      { name: "Industrial Compressor Co", contactName: "Beth Green", email: "parts@indcomp.demo", phone: "(555) 302-2005", serviceType: "Compressor" },
      { name: "Guardian Fire & Safety", contactName: "Mike Foster", email: "inspection@guardianfire.demo", phone: "(555) 302-2006", serviceType: "Fire Safety" },
      { name: "Generator Pro", contactName: "Rick Adams", email: "service@genpro.demo", phone: "(555) 302-2007", serviceType: "Generator" },
      { name: "Boiler Services LLC", contactName: "Carol White", email: "maintenance@boilersvc.demo", phone: "(555) 302-2008", serviceType: "Boiler" },
      { name: "Cooling Tower Specialists", contactName: "Tim Clark", email: "service@coolingtower.demo", phone: "(555) 302-2009", serviceType: "Cooling Tower" },
    ],
    products: [
      { name: "Air Filter MERV 8", sku: "NST-FLT-M8", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 60 },
      { name: "Fan Belt", sku: "NST-BLT", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 40 },
      { name: "Compressor Oil", sku: "NST-OIL", category: "Mechanical", unitOfMeasure: "gal", defaultQuantity: 24 },
      { name: "Conveyor Belt Lacing", sku: "NST-CVB", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 30 },
      { name: "Electrical Breaker", sku: "NST-BRK", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 35 },
      { name: "Pump Seal", sku: "NST-PMP-SL", category: "Pump", unitOfMeasure: "ea", defaultQuantity: 20 },
      { name: "Grease Tube", sku: "NST-GRS", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 80 },
      { name: "V-Belt Set", sku: "NST-VBLT", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 25 },
      { name: "Pressure Gauge", sku: "NST-GAUGE", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 15 },
      { name: "Thermocouple", sku: "NST-THERM", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 18 },
      { name: "Filter Drier", sku: "NST-DRIER", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 14 },
      { name: "Motor Bearing", sku: "NST-BRNG", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 22 },
      { name: "Safety Switch", sku: "NST-SW", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 28 },
      { name: "Gasket Kit", sku: "NST-GSK", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 16 },
      { name: "LED High Bay", sku: "NST-LED", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 32 },
      { name: "Cooling Tower Treatment", sku: "NST-CT-TRT", category: "Cooling Tower", unitOfMeasure: "gal", defaultQuantity: 20 },
      { name: "Battery Backup", sku: "NST-BAT", category: "Generator", unitOfMeasure: "ea", defaultQuantity: 8 },
      { name: "Fuse Kit", sku: "NST-FUSE", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 40 },
      { name: "Lubricant Spray", sku: "NST-LUB", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 36 },
    ],
    assetPatterns: [
      { namePrefix: "Air Compressor", type: "Compressor", countPerBuilding: 1 },
      { namePrefix: "Conveyor", type: "Other", countPerBuilding: 2 },
      { namePrefix: "Pump", type: "Pump", countPerBuilding: 2 },
      { namePrefix: "Generator", type: "Generator", countPerBuilding: 1 },
      { namePrefix: "Boiler", type: "Boiler", countPerBuilding: 1 },
      { namePrefix: "Electrical Panel", type: "Electrical", countPerBuilding: 2 },
      { namePrefix: "HVAC Unit", type: "HVAC", countPerBuilding: 1 },
      { namePrefix: "Cooling Tower", type: "Cooling Tower", countPerBuilding: 1 },
      { namePrefix: "Air Handler", type: "Air Handler", countPerBuilding: 1 },
    ],
    workOrderTitles: [
      "Conveyor motor overheating",
      "Compressor oil change",
      "Electrical panel hotspot inspection",
      "Pump pressure failure",
      "Generator monthly test",
      "Boiler combustion check",
      "Cooling tower water treatment",
      "Conveyor belt tracking adjustment",
      "Air compressor filter replacement",
      "VFD calibration",
    ],
    requestTitles: [
      "Line 2 conveyor making noise",
      "Compressor room too hot",
      "Light flickering in electrical room",
    ],
    pmTemplateNames: [
      { name: "Weekly generator test", frequency: "weekly" },
      { name: "Monthly conveyor lubrication", frequency: "monthly" },
      { name: "Quarterly compressor inspection", frequency: "quarterly" },
      { name: "Monthly boiler inspection", frequency: "monthly" },
      { name: "Quarterly electrical panel thermography", frequency: "quarterly" },
    ],
  },
  {
    tenantName: "Riverside Unified School District",
    slug: "riverside-schools-demo",
    companyName: "Riverside Unified School District",
    locations: [
      {
        propertyName: "Riverside High School",
        buildings: [
          { name: "Main Building", units: ["Classrooms A", "Classrooms B", "Gym", "Cafeteria", "Boiler Room", "Front Office", "Roof"] },
          { name: "Annex", units: ["Science Wing", "Library", "Mechanical Room"] },
        ],
      },
      {
        propertyName: "Lincoln Middle School",
        buildings: [
          { name: "School Building", units: ["Classrooms", "Gym", "Cafeteria", "Boiler Room", "Office", "Roof"] },
        ],
      },
      {
        propertyName: "Washington Elementary",
        buildings: [
          { name: "Elementary Building", units: ["Classrooms", "Cafeteria", "Boiler Room", "Office", "Roof"] },
        ],
      },
      {
        propertyName: "District Administration Building",
        buildings: [
          { name: "Admin", units: ["Office", "IT Room", "Mechanical Room", "Roof"] },
        ],
      },
      {
        propertyName: "Transportation / Maintenance Facility",
        buildings: [
          { name: "Bus Lot", units: ["Bus Bay 1", "Bus Bay 2", "Shop", "Fuel Island"] },
          { name: "Maintenance Shop", units: ["Shop Floor", "Parts Room", "Office"] },
        ],
      },
    ],
    technicians: [
      { name: "Tom Bradley", email: "t.bradley@riverside.edu.demo", phone: "(555) 203-3001", trade: "HVAC" },
      { name: "Maria Garcia", email: "m.garcia@riverside.edu.demo", phone: "(555) 203-3002", trade: "General Maintenance" },
      { name: "Steve Norton", email: "s.norton@riverside.edu.demo", phone: "(555) 203-3003", trade: "Electrical" },
      { name: "Linda Foster", email: "l.foster@riverside.edu.demo", phone: "(555) 203-3004", trade: "Plumbing" },
      { name: "Joe Martinez", email: "j.martinez@riverside.edu.demo", phone: "(555) 203-3005", trade: "PM Specialist" },
      { name: "Amy Wright", email: "a.wright@riverside.edu.demo", phone: "(555) 203-3006", trade: "Facilities Technician" },
      { name: "Chris Evans", email: "c.evans@riverside.edu.demo", phone: "(555) 203-3007", trade: "HVAC" },
    ],
    vendors: [
      { name: "School Kitchen Equipment Repair", contactName: "Dan Moore", email: "service@schoolkitchen.demo", phone: "(555) 303-3001", serviceType: "Appliance" },
      { name: "Precision HVAC Services", contactName: "Tom Bradley", email: "service@precisionhvac.demo", phone: "(555) 303-3002", serviceType: "HVAC" },
      { name: "Guardian Fire & Safety", contactName: "Mike Foster", email: "inspection@guardianfire.demo", phone: "(555) 303-3003", serviceType: "Fire Safety" },
      { name: "Metro Electrical", contactName: "Susan Lee", email: "dispatch@metroelectric.demo", phone: "(555) 303-3004", serviceType: "Electrical" },
      { name: "Plumbing Pros", contactName: "Amanda Cruz", email: "dispatch@plumbingpros.demo", phone: "(555) 303-3005", serviceType: "Plumbing" },
      { name: "Generator Pro", contactName: "Rick Adams", email: "service@genpro.demo", phone: "(555) 303-3006", serviceType: "Generator" },
      { name: "Commercial Roofing", contactName: "Robert Hayes", email: "estimates@commercialroof.demo", phone: "(555) 303-3007", serviceType: "Roofing" },
      { name: "Playground Safety Inc", contactName: "Karen Bell", email: "inspection@playground.demo", phone: "(555) 303-3008", serviceType: "Other" },
    ],
    products: [
      { name: "MERV 8 Filter 20x20", sku: "RIV-FLT-2020", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 60 },
      { name: "Thermostat", sku: "RIV-THR", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 24 },
      { name: "LED Tube T8", sku: "RIV-LED-T8", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 80 },
      { name: "Smoke Detector", sku: "RIV-SMOKE", category: "Fire Safety", unitOfMeasure: "ea", defaultQuantity: 40 },
      { name: "Boiler Gasket", sku: "RIV-BOIL-GSK", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 12 },
      { name: "Faucet Cartridge", sku: "RIV-FAUCET", category: "Plumbing", unitOfMeasure: "ea", defaultQuantity: 30 },
      { name: "Generator Battery", sku: "RIV-GEN-BAT", category: "Generator", unitOfMeasure: "ea", defaultQuantity: 6 },
      { name: "Circuit Breaker", sku: "RIV-BRK", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 25 },
      { name: "Filter Drier", sku: "RIV-DRIER", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 14 },
      { name: "Grease Cartridge", sku: "RIV-GRS", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 36 },
      { name: "Door Closer", sku: "RIV-DOOR", category: "Other", unitOfMeasure: "ea", defaultQuantity: 18 },
      { name: "Ballast", sku: "RIV-BAL", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 32 },
      { name: "Pump Seal", sku: "RIV-PMP", category: "Plumbing", unitOfMeasure: "ea", defaultQuantity: 10 },
      { name: "Refrigerant", sku: "RIV-REF", category: "HVAC", unitOfMeasure: "lb", defaultQuantity: 20 },
      { name: "Fire Extinguisher", sku: "RIV-EXT", category: "Fire Safety", unitOfMeasure: "ea", defaultQuantity: 15 },
    ],
    assetPatterns: [
      { namePrefix: "Classroom HVAC", type: "HVAC", countPerBuilding: 3 },
      { namePrefix: "Gym Lighting", type: "Lighting", countPerBuilding: 1 },
      { namePrefix: "Boiler", type: "Boiler", countPerBuilding: 1 },
      { namePrefix: "Kitchen Hood", type: "Appliance", countPerBuilding: 1 },
      { namePrefix: "Fire Panel", type: "Fire Safety", countPerBuilding: 1 },
      { namePrefix: "Generator", type: "Generator", countPerBuilding: 1 },
      { namePrefix: "Electrical Panel", type: "Electrical", countPerBuilding: 2 },
      { namePrefix: "Drinking Fountain", type: "Plumbing", countPerBuilding: 2 },
    ],
    workOrderTitles: [
      "Classroom too hot",
      "Drinking fountain leak",
      "Gym lights flickering",
      "Boiler room inspection",
      "Cafeteria refrigeration issue",
      "Thermostat not responding",
      "Fire alarm test",
      "Filter replacement",
    ],
    requestTitles: [
      "Room 204 is too cold",
      "Bathroom sink dripping",
      "Lights out in hallway",
      "HVAC noise in classroom",
    ],
    pmTemplateNames: [
      { name: "Monthly HVAC filter check", frequency: "monthly" },
      { name: "Quarterly fire alarm test", frequency: "quarterly" },
      { name: "Weekly generator test", frequency: "weekly" },
      { name: "Quarterly kitchen equipment sanitation", frequency: "quarterly" },
      { name: "Monthly boiler inspection", frequency: "monthly" },
    ],
  },
  {
    tenantName: "Mercy Regional Medical Center",
    slug: "mercy-healthcare-demo",
    companyName: "Mercy Regional Medical Center",
    locations: [
      {
        propertyName: "Main Hospital",
        buildings: [
          { name: "Hospital Tower", units: ["ICU Hallway", "OR Wing", "Mechanical Room", "Roof", "Pharmacy Wing", "Waiting Area", "Central Plant"] },
        ],
      },
      {
        propertyName: "Outpatient Clinic",
        buildings: [
          { name: "Clinic Building", units: ["Main Floor", "Upper Floor", "Mechanical Room", "Roof"] },
        ],
      },
      {
        propertyName: "Surgery Center",
        buildings: [
          { name: "Surgery Building", units: ["OR 1-4", "Pre-Op", "Mechanical Room", "Roof"] },
        ],
      },
      {
        propertyName: "Medical Office Building",
        buildings: [
          { name: "MOB", units: ["Suite 100", "Suite 200", "Suite 300", "Mechanical Room", "Roof"] },
        ],
      },
      {
        propertyName: "Parking Garage / Facilities Building",
        buildings: [
          { name: "Parking Garage", units: ["Level 1", "Level 2", "Level 3", "Mechanical Room"] },
          { name: "Facilities Building", units: ["Central Plant", "Shop", "Storage"] },
        ],
      },
    ],
    technicians: [
      { name: "Jennifer Walsh", email: "j.walsh@mercy.demo", phone: "(555) 204-4001", trade: "HVAC" },
      { name: "Michael Torres", email: "m.torres@mercy.demo", phone: "(555) 204-4002", trade: "Electrical" },
      { name: "Susan Kim", email: "s.kim@mercy.demo", phone: "(555) 204-4003", trade: "General Maintenance" },
      { name: "David Lopez", email: "d.lopez@mercy.demo", phone: "(555) 204-4004", trade: "PM Specialist" },
      { name: "Emily Chen", email: "e.chen@mercy.demo", phone: "(555) 204-4005", trade: "Facilities Technician" },
      { name: "Robert Martinez", email: "r.martinez@mercy.demo", phone: "(555) 204-4006", trade: "HVAC" },
      { name: "Nancy Adams", email: "n.adams@mercy.demo", phone: "(555) 204-4007", trade: "Medical Gas" },
      { name: "Kevin Brown", email: "k.brown@mercy.demo", phone: "(555) 204-4008", trade: "Electrical" },
    ],
    vendors: [
      { name: "Medical Gas Compliance Services", contactName: "Lisa Grant", email: "compliance@medgas.demo", phone: "(555) 304-4001", serviceType: "Other" },
      { name: "Precision HVAC Services", contactName: "Tom Bradley", email: "service@precisionhvac.demo", phone: "(555) 304-4002", serviceType: "HVAC" },
      { name: "Apex Elevator Services", contactName: "Jennifer Walsh", email: "service@apexelevator.demo", phone: "(555) 304-4003", serviceType: "Elevator" },
      { name: "Guardian Fire & Safety", contactName: "Mike Foster", email: "inspection@guardianfire.demo", phone: "(555) 304-4004", serviceType: "Fire Safety" },
      { name: "Metro Electrical", contactName: "Susan Lee", email: "dispatch@metroelectric.demo", phone: "(555) 304-4005", serviceType: "Electrical" },
      { name: "Generator Pro", contactName: "Rick Adams", email: "service@genpro.demo", phone: "(555) 304-4006", serviceType: "Generator" },
      { name: "Cooling Tower Specialists", contactName: "Tim Clark", email: "service@coolingtower.demo", phone: "(555) 304-4007", serviceType: "Cooling Tower" },
      { name: "Sterilization Equipment Co", contactName: "Paul Davis", email: "service@sterilize.demo", phone: "(555) 304-4008", serviceType: "Other" },
    ],
    products: [
      { name: "HEPA Filter 24x24", sku: "MRC-HEPA-2424", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 40 },
      { name: "MERV 14 Filter", sku: "MRC-M14", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 36 },
      { name: "Thermostat", sku: "MRC-THR", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 20 },
      { name: "LED Panel", sku: "MRC-LED", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 45 },
      { name: "Circuit Breaker", sku: "MRC-BRK", category: "Electrical", unitOfMeasure: "ea", defaultQuantity: 28 },
      { name: "Smoke Detector", sku: "MRC-SMOKE", category: "Fire Safety", unitOfMeasure: "ea", defaultQuantity: 30 },
      { name: "Generator Battery", sku: "MRC-GEN-BAT", category: "Generator", unitOfMeasure: "ea", defaultQuantity: 6 },
      { name: "Pump Seal", sku: "MRC-PMP", category: "Pump", unitOfMeasure: "ea", defaultQuantity: 12 },
      { name: "Cooling Tower Treatment", sku: "MRC-CT", category: "Cooling Tower", unitOfMeasure: "gal", defaultQuantity: 16 },
      { name: "Ballast", sku: "MRC-BAL", category: "Lighting", unitOfMeasure: "ea", defaultQuantity: 24 },
      { name: "Filter Drier", sku: "MRC-DRIER", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 14 },
      { name: "Motor Bearing", sku: "MRC-BRNG", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 10 },
      { name: "Gasket Kit", sku: "MRC-GSK", category: "Mechanical", unitOfMeasure: "ea", defaultQuantity: 8 },
      { name: "Medical Gas Valve", sku: "MRC-MG-VLV", category: "Other", unitOfMeasure: "ea", defaultQuantity: 6 },
      { name: "Air Handler Filter", sku: "MRC-AHU-FLT", category: "HVAC", unitOfMeasure: "ea", defaultQuantity: 32 },
    ],
    assetPatterns: [
      { namePrefix: "AHU", type: "Air Handler", countPerBuilding: 2 },
      { namePrefix: "Generator", type: "Generator", countPerBuilding: 1 },
      { namePrefix: "Medical Gas Panel", type: "Other", countPerBuilding: 1 },
      { namePrefix: "Elevator", type: "Elevator", countPerBuilding: 1 },
      { namePrefix: "Cooling Tower", type: "Cooling Tower", countPerBuilding: 1 },
      { namePrefix: "Critical HVAC", type: "HVAC", countPerBuilding: 2 },
      { namePrefix: "Electrical Panel", type: "Electrical", countPerBuilding: 2 },
      { namePrefix: "Sterilization Support", type: "Other", countPerBuilding: 1 },
      { namePrefix: "Lighting Panel", type: "Lighting", countPerBuilding: 1 },
    ],
    workOrderTitles: [
      "Operating room temp variance",
      "ICU hallway lighting outage",
      "Generator weekly test",
      "Elevator door issue",
      "AHU filter replacement",
      "Medical gas pressure check",
      "Cooling tower water treatment",
      "OR humidity calibration",
    ],
    requestTitles: [
      "Patient room temperature issue",
      "Noise from rooftop unit",
      "Light flickering in hallway",
    ],
    pmTemplateNames: [
      { name: "Weekly generator test", frequency: "weekly" },
      { name: "Monthly AHU filter replacement", frequency: "monthly" },
      { name: "Quarterly medical gas compliance", frequency: "quarterly" },
      { name: "Monthly cooling tower treatment", frequency: "monthly" },
      { name: "Quarterly elevator inspection", frequency: "quarterly" },
    ],
  },
];
