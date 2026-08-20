import { apiRequest } from "@/lib/api/http-client";

export interface SQLServer {
  id: number;
  name: string;
  host: string;
  port: number;
  authentication_type: string;
  username?: string | null;
  /**
   * Pointer to the credential in the secret store — the gateway never accepts
   * or returns a password, so this is what the form collects in its place.
   */
  secret_reference?: string | null;
  connection_options?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export type SQLServerInput = Omit<SQLServer, "id" | "created_at">;

export interface SyncResponse {
  databases_added: number;
  databases_updated: number;
  tables_added: number;
  tables_updated: number;
  failed_databases: Array<{
    database_id: number | null;
    name: string;
    error: string;
  }>;
}

/** Stored value -> label. The API's vocabulary, spelled for the console. */
export const AUTHENTICATION_TYPES = [
  { value: "sql_password", label: "SQL Password" },
  { value: "azure_ad", label: "Azure AD" },
  { value: "managed_identity", label: "Managed Identity" },
] as const;

export function authenticationLabel(value: string): string {
  return AUTHENTICATION_TYPES.find((type) => type.value === value)?.label ?? value;
}

/** Only SQL Password takes a username and a stored secret. */
export function requiresCredentials(authenticationType: string): boolean {
  return authenticationType === "sql_password";
}

export async function getSQLServers(): Promise<SQLServer[]> {
  return apiRequest<SQLServer[]>("/sql-servers/");
}

export async function createSQLServer(data: SQLServerInput): Promise<SQLServer> {
  return apiRequest<SQLServer>("/sql-servers/", { method: "POST", body: data });
}

export async function updateSQLServer(
  id: number,
  data: Partial<SQLServerInput>
): Promise<SQLServer> {
  return apiRequest<SQLServer>(`/sql-servers/${id}`, { method: "PATCH", body: data });
}

export async function deleteSQLServer(id: number): Promise<void> {
  return apiRequest<void>(`/sql-servers/${id}`, { method: "DELETE" });
}

/**
 * Connects to the server and re-discovers its databases and tables. This is
 * also the only round trip that proves the stored connection still works, so
 * the row's "check connection" action runs it.
 */
export async function syncSQLServer(id: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/sql-servers/${id}/sync`, { method: "POST" });
}
