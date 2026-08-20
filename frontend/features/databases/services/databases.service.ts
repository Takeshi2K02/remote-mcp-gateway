import { apiRequest } from "@/lib/api/http-client";
import type { SyncResponse } from "@/features/sql-servers/services/sql-servers.service";

export interface DatabaseModel {
  id: number;
  sql_server_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  last_synced_at?: string | null;
}

export type DatabaseInput = Omit<
  DatabaseModel,
  "id" | "created_at" | "last_synced_at"
>;

export async function getDatabases(): Promise<DatabaseModel[]> {
  return apiRequest<DatabaseModel[]>("/databases/");
}

export async function createDatabase(data: DatabaseInput): Promise<DatabaseModel> {
  return apiRequest<DatabaseModel>("/databases/", { method: "POST", body: data });
}

export async function updateDatabase(
  id: number,
  data: Partial<DatabaseInput>
): Promise<DatabaseModel> {
  return apiRequest<DatabaseModel>(`/databases/${id}`, { method: "PATCH", body: data });
}

export async function deleteDatabase(id: number): Promise<void> {
  return apiRequest<void>(`/databases/${id}`, { method: "DELETE" });
}

/** Re-discovers the tables inside one database. */
export async function syncDatabaseTables(databaseId: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/databases/${databaseId}/sync`, { method: "POST" });
}
