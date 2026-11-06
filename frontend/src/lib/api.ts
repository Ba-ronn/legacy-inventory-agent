import axios from 'axios';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

export const TENANT_ID =
  (import.meta.env.VITE_TENANT_ID as string | undefined) ?? 'test_tenant';

export interface SchemaColumn {
  name: string;
  type: string;
}

export interface SchemaTable {
  table_name: string;
  columns: SchemaColumn[];
}

export interface ColumnMap {
  logical_name: string;
  physical_name: string;
  data_type: string;
}

export interface TableMap {
  logical_name: string;
  physical_name: string;
  columns: Record<string, ColumnMap>;
}

export interface MappingManifest {
  tenant_id: string;
  db_dialect: string;
  tables: Record<string, TableMap>;
}

const client = axios.create({ baseURL: API_BASE_URL });

/** Reflects the user's legacy schema over their connection string. */
export async function inspectDatabase(connectionString: string): Promise<SchemaTable[]> {
  const { data } = await client.post('/api/v1/onboarding/inspect', {
    connection_string: connectionString,
  });
  return data.tables;
}

/** Asks the LLM to bridge the reflected schema onto our standard model. */
export async function suggestMapping(
  dbDialect: string,
  legacySchema: SchemaTable[],
): Promise<MappingManifest> {
  const { data } = await client.post('/api/v1/onboarding/suggest-mapping', {
    tenant_id: TENANT_ID,
    db_dialect: dbDialect,
    legacy_schema: legacySchema,
  });
  return data;
}

/**
 * Persists the mapping the user approved, scoped to the database it was built
 * from so several saved connections can each keep their own mapping.
 */
export async function saveManifest(
  manifest: MappingManifest,
  connectionString: string,
): Promise<void> {
  await client.post('/api/v1/onboarding/save-manifest', {
    manifest,
    connection_string: connectionString,
  });
}

export interface ManifestStatus {
  exists: boolean;
  db_dialect: string | null;
  table_count: number;
  column_count: number;
}

/**
 * Asks whether this connection already has an approved mapping, so a saved
 * database can be resumed instead of re-onboarded.
 */
export async function manifestStatus(connectionString: string): Promise<ManifestStatus> {
  const { data } = await client.post('/api/v1/onboarding/manifest-status', {
    tenant_id: TENANT_ID,
    connection_string: connectionString,
  });
  return data;
}

/** Sends a natural language query to the agent. */
export async function sendChatQuery(connectionString: string, query: string): Promise<string> {
  const { data } = await client.post('/api/v1/chat/query', {
    tenant_id: TENANT_ID,
    connection_string: connectionString,
    query,
  });
  return data.response;
}

const CONNECTION_KEY = 'ais.connection-string';

/**
 * The connection string is captured during onboarding and reused by the chat
 * page, so it is never hardcoded into the bundle.
 */
export function saveConnectionString(value: string): void {
  try {
    localStorage.setItem(CONNECTION_KEY, value);
  } catch {
    // Storage can be unavailable (private browsing); the chat page then falls
    // back to build-time configuration.
  }
}

export function loadConnectionString(): string | null {
  try {
    const stored = localStorage.getItem(CONNECTION_KEY);
    if (stored) return stored;
  } catch {
    // Ignored for the same reason as above.
  }
  return (import.meta.env.VITE_CONNECTION_STRING as string | undefined) ?? null;
}

/** Pulls the useful message out of a FastAPI error response. */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
