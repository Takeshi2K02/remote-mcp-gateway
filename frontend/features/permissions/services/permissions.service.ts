import { apiRequest } from "@/lib/api/http-client";

export interface SQLServerPermission {
  id: number;
  user_id: number;
  sql_server_id: number;
  created_at: string;
}

export interface DatabasePermission {
  id: number;
  user_id: number;
  database_id: number;
  created_at: string;
}

export interface TablePermission {
  id: number;
  user_id: number;
  table_id: number;
  created_at: string;
}

export async function getSQLServerPermissions(): Promise<SQLServerPermission[]> {
  return apiRequest<SQLServerPermission[]>("/user-sql-server-permissions");
}

export async function createSQLServerPermission(data: { user_id: number; sql_server_id: number }): Promise<SQLServerPermission> {
  return apiRequest<SQLServerPermission>("/user-sql-server-permissions", {
    method: "POST",
    body: data,
  });
}

export async function deleteSQLServerPermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-sql-server-permissions/${id}`, {
    method: "DELETE",
  });
}

export async function getDatabasePermissions(): Promise<DatabasePermission[]> {
  return apiRequest<DatabasePermission[]>("/user-database-permissions");
}

export async function createDatabasePermission(data: { user_id: number; database_id: number }): Promise<DatabasePermission> {
  return apiRequest<DatabasePermission>("/user-database-permissions", {
    method: "POST",
    body: data,
  });
}

export async function deleteDatabasePermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-database-permissions/${id}`, {
    method: "DELETE",
  });
}

export async function getTablePermissions(): Promise<TablePermission[]> {
  return apiRequest<TablePermission[]>("/user-table-permissions");
}

export async function createTablePermission(data: { user_id: number; table_id: number }): Promise<TablePermission> {
  return apiRequest<TablePermission>("/user-table-permissions", {
    method: "POST",
    body: data,
  });
}

export async function deleteTablePermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-table-permissions/${id}`, {
    method: "DELETE",
  });
}

