import { apiRequest } from "@/lib/api/http-client";
import type { SyncResponse } from "@/features/sql-servers/services/sql-servers.service";

export interface DatabaseTable {
  id: number;
  database_id: number;
  schema_name: string;
  table_name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  last_synced_at?: string | null;
}

export type DatabaseTableInput = Omit<
  DatabaseTable,
  "id" | "is_active" | "created_at" | "last_synced_at"
>;

export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  return apiRequest<DatabaseTable[]>("/database-tables/");
}

export async function createDatabaseTable(
  data: DatabaseTableInput
): Promise<DatabaseTable> {
  return apiRequest<DatabaseTable>("/database-tables/", { method: "POST", body: data });
}

export async function updateDatabaseTable(
  id: number,
  data: Partial<DatabaseTableInput & { is_active: boolean }>
): Promise<DatabaseTable> {
  return apiRequest<DatabaseTable>(`/database-tables/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDatabaseTable(id: number): Promise<void> {
  return apiRequest<void>(`/database-tables/${id}`, { method: "DELETE" });
}

/** Re-discovers the tables in one database. */
export async function syncTables(databaseId: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/databases/${databaseId}/sync`, { method: "POST" });
}
