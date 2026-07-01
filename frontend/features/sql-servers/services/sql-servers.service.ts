import { apiRequest } from "@/lib/api/http-client";

export interface SQLServer {
  id: number;
  name: string;
  host: string;
  port: number;
  authentication_type: string;
  username?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

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

export async function getSQLServers(): Promise<SQLServer[]> {
  return apiRequest<SQLServer[]>("/sql-servers");
}

export async function createSQLServer(data: Omit<SQLServer, "id" | "created_at">): Promise<SQLServer> {
  return apiRequest<SQLServer>("/sql-servers", {
    method: "POST",
    body: data,
  });
}

export async function updateSQLServer(
  id: number,
  data: Partial<Omit<SQLServer, "id" | "created_at">>
): Promise<SQLServer> {
  return apiRequest<SQLServer>(`/sql-servers/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteSQLServer(id: number): Promise<void> {
  return apiRequest<void>(`/sql-servers/${id}`, {
    method: "DELETE",
  });
}

export async function syncSQLServer(id: number): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(`/sql-servers/${id}/sync`, {
    method: "POST",
  });
}
