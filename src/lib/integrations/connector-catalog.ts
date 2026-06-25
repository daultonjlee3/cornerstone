import type { IntegrationProvider } from "@/src/types/fleet";

export type ConnectorKey =
  | "samsara"
  | "geotab"
  | "motive"
  | "fleetio"
  | "quickbooks"
  | "csv"
  | "rest_api"
  | "webhook";

export type ConnectorType =
  | "telematics"
  | "fleet_operations"
  | "accounting"
  | "import"
  | "rest_ingest"
  | "webhook";

export type ConnectorAuthType =
  | "oauth"
  | "api_key"
  | "bearer_token"
  | "webhook_secret"
  | "none";

export type ConnectorDefinition = {
  key: ConnectorKey;
  provider: IntegrationProvider;
  displayName: string;
  connectorType: ConnectorType;
  authType: ConnectorAuthType;
  supportsHistoricalSync: boolean;
  supportsPushWebhook: boolean;
  mappingObjectTypes: string[];
};

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    key: "samsara",
    provider: "samsara",
    displayName: "Samsara",
    connectorType: "telematics",
    authType: "oauth",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["trucks", "jobs", "sites"],
  },
  {
    key: "geotab",
    provider: "geotab",
    displayName: "Geotab",
    connectorType: "telematics",
    authType: "api_key",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["trucks", "jobs", "sites"],
  },
  {
    key: "motive",
    provider: "motive",
    displayName: "Motive",
    connectorType: "telematics",
    authType: "oauth",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["trucks", "jobs", "sites"],
  },
  {
    key: "fleetio",
    provider: "fleetio",
    displayName: "Fleetio",
    connectorType: "fleet_operations",
    authType: "api_key",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["trucks", "operators", "jobs"],
  },
  {
    key: "quickbooks",
    provider: "quickbooks",
    displayName: "QuickBooks",
    connectorType: "accounting",
    authType: "oauth",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["jobs", "customers"],
  },
  {
    key: "csv",
    provider: "csv_manual",
    displayName: "CSV Import",
    connectorType: "import",
    authType: "none",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["branches", "trucks", "operators", "jobs", "customers", "sites", "equipment"],
  },
  {
    key: "rest_api",
    provider: "rest_api",
    displayName: "REST API",
    connectorType: "rest_ingest",
    authType: "bearer_token",
    supportsHistoricalSync: true,
    supportsPushWebhook: false,
    mappingObjectTypes: ["branches", "trucks", "operators", "jobs", "customers", "sites", "equipment"],
  },
  {
    key: "webhook",
    provider: "webhook",
    displayName: "Webhook",
    connectorType: "webhook",
    authType: "webhook_secret",
    supportsHistoricalSync: false,
    supportsPushWebhook: true,
    mappingObjectTypes: ["jobs", "trucks", "sites"],
  },
] as const;

export function getConnectorDefinitionByKey(key: string): ConnectorDefinition | null {
  return CONNECTOR_CATALOG.find((connector) => connector.key === key) ?? null;
}

export function getConnectorDefinitionByProvider(
  provider: IntegrationProvider
): ConnectorDefinition | null {
  return CONNECTOR_CATALOG.find((connector) => connector.provider === provider) ?? null;
}
