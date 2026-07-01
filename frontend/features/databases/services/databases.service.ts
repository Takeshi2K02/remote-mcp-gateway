import { apiRequest } from "@/lib/api/http-client";
import { SyncResponse } from "@/features/sql-servers/services/sql-servers.service";

export interface DatabaseModel {
  id: number;
  sql_server_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  last_synced_at?: string | null;
}

export async function getDatabases(): Promise<DatabaseModel[]> {
  return apiRequest<DatabaseModel[]>("/databases");
}

export async function createDatabase(data: Omit<DatabaseModel, "id" | "created_at" | "last_synced_at">): Promise<DatabaseModel> {
  return apiRequest<DatabaseModel>("/databases", {
    method: "POST",
    body: data,
  });
}

export async function updateDatabase(
  id: number,
  data: Partial<Omit<DatabaseModel, "id" | "created_at" | "last_synced_at">>
): Promise<DatabaseModel> {
  return apiRequest<DatabaseModel>(`/databases/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDatabase(id: number): Promise<void> {
  return apiRequest<void>(`/databases/${id}`, {
    method: "DELETE",
  });
}

export async function syncDatabases(serverId: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/sql-servers/${serverId}/sync`, {
    method: "POST",
  });
}

export async function syncDatabaseTables(databaseId: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/databases/${databaseId}/sync`, {
    method: "POST",
  });
}
