export type ImportObjectType =
  | "branches"
  | "trucks"
  | "operators"
  | "jobs"
  | "customers"
  | "sites"
  | "equipment";

export type ImportFieldSchema = {
  key: string;
  label: string;
  required: boolean;
  synonyms: string[];
};

export type ImportObjectSchema = {
  objectType: ImportObjectType;
  fields: ImportFieldSchema[];
};

const schemas: Record<ImportObjectType, ImportObjectSchema> = {
  branches: {
    objectType: "branches",
    fields: [
      { key: "name", label: "Branch Name", required: true, synonyms: ["branch", "branch_name"] },
      { key: "branch_code", label: "Branch Code", required: true, synonyms: ["code"] },
      { key: "timezone", label: "Timezone", required: false, synonyms: ["tz"] },
      { key: "currency", label: "Currency", required: false, synonyms: ["currency_code"] },
      { key: "units", label: "Units", required: false, synonyms: ["units_preference"] },
    ],
  },
  trucks: {
    objectType: "trucks",
    fields: [
      { key: "branch_code", label: "Branch Code", required: true, synonyms: ["branch"] },
      { key: "unit_number", label: "Unit Number", required: true, synonyms: ["truck_number", "truck_unit"] },
      { key: "truck_type", label: "Truck Type", required: true, synonyms: ["vehicle_type"] },
      { key: "capacity_gallons", label: "Capacity Gallons", required: false, synonyms: ["capacity"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["external_truck_id"] },
    ],
  },
  operators: {
    objectType: "operators",
    fields: [
      { key: "branch_code", label: "Branch Code", required: true, synonyms: ["branch"] },
      { key: "name", label: "Operator Name", required: true, synonyms: ["operator_name"] },
      { key: "operator_role", label: "Operator Role", required: true, synonyms: ["role"] },
      { key: "email", label: "Email", required: false, synonyms: ["operator_email"] },
      { key: "phone", label: "Phone", required: false, synonyms: ["operator_phone"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["operator_external_id"] },
    ],
  },
  jobs: {
    objectType: "jobs",
    fields: [
      { key: "branch_code", label: "Branch Code", required: true, synonyms: ["branch"] },
      { key: "title", label: "Job Title", required: true, synonyms: ["job_title", "name"] },
      { key: "site_name", label: "Site Name", required: false, synonyms: ["location_name"] },
      { key: "site_external_id", label: "Site External ID", required: false, synonyms: ["location_external_id"] },
      { key: "required_truck_type", label: "Required Truck Type", required: true, synonyms: ["truck_type"] },
      { key: "scheduled_start", label: "Scheduled Start", required: true, synonyms: ["start_time"] },
      { key: "scheduled_end", label: "Scheduled End", required: true, synonyms: ["end_time"] },
      { key: "revenue_estimate", label: "Revenue Estimate", required: true, synonyms: ["revenue"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["job_external_id"] },
      { key: "unit_number", label: "Assigned Unit", required: false, synonyms: ["truck_unit"] },
    ],
  },
  customers: {
    objectType: "customers",
    fields: [
      { key: "name", label: "Customer Name", required: true, synonyms: ["customer_name"] },
      { key: "email", label: "Email", required: false, synonyms: ["customer_email"] },
      { key: "phone", label: "Phone", required: false, synonyms: ["customer_phone"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["customer_external_id"] },
      { key: "address", label: "Address", required: false, synonyms: ["billing_address", "street"] },
    ],
  },
  sites: {
    objectType: "sites",
    fields: [
      { key: "name", label: "Site Name", required: true, synonyms: ["site_name", "location_name"] },
      { key: "customer_name", label: "Customer Name", required: false, synonyms: ["customer"] },
      { key: "address_line1", label: "Address", required: false, synonyms: ["address"] },
      { key: "city", label: "City", required: false, synonyms: ["town"] },
      { key: "state", label: "State", required: false, synonyms: ["province"] },
      { key: "postal_code", label: "Postal Code", required: false, synonyms: ["zip"] },
      { key: "latitude", label: "Latitude", required: false, synonyms: ["lat"] },
      { key: "longitude", label: "Longitude", required: false, synonyms: ["lng", "lon"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["site_external_id"] },
    ],
  },
  equipment: {
    objectType: "equipment",
    fields: [
      { key: "name", label: "Equipment Name", required: true, synonyms: ["asset_name"] },
      { key: "serial_number", label: "Serial Number", required: false, synonyms: ["serial"] },
      { key: "category", label: "Category", required: false, synonyms: ["asset_category"] },
      { key: "status", label: "Status", required: false, synonyms: ["equipment_status"] },
      { key: "external_id", label: "External ID", required: false, synonyms: ["equipment_external_id"] },
    ],
  },
};

export function getImportSchema(objectType: ImportObjectType): ImportObjectSchema {
  return schemas[objectType];
}

export function listImportSchemas(): ImportObjectSchema[] {
  return Object.values(schemas);
}
