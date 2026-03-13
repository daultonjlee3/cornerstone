export type AssetImportField =
  | "property"
  | "building"
  | "asset_name"
  | "asset_type"
  | "manufacturer"
  | "model"
  | "serial_number"
  | "install_date"
  | "location"
  | "notes"
  | "criticality";

export type ParsedSpreadsheet = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
};

export type FieldMapping = Partial<Record<AssetImportField, string>>;

export type MappedAssetRow = {
  property: string;
  building: string;
  asset_name: string;
  asset_type?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  install_date?: string | null;
  location?: string | null;
  notes?: string | null;
  criticality?: string | null;
};
