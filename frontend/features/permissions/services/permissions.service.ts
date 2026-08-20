import { apiRequest } from "@/lib/api/http-client";
import type { PermissionChange, ServerNode } from "../types/permission-tree.types";

/**
 * The gateway stores access in three tables — server, database and table — and
 * exposes them to the console as one hierarchy plus one batched write. The
 * flat per-level endpoints below back the same tables and are kept for callers
 * that need to inspect a single level.
 */

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

/** One user's full server -> database -> table tree, with grants marked. */
export async function getPermissionTree(userId: number): Promise<ServerNode[]> {
  return apiRequest<ServerNode[]>(`/users/${userId}/permission-tree`);
}

/**
 * Applies a batch of grants and revokes in one transaction. Responds 204, so
 * there is nothing to read back — callers refetch the tree.
 */
export async function savePermissions(
  userId: number,
  changes: PermissionChange[]
): Promise<void> {
  return apiRequest<void>(`/users/${userId}/permissions`, {
    method: "PUT",
    body: { changes },
  });
}

export async function getSQLServerPermissions(): Promise<SQLServerPermission[]> {
  return apiRequest<SQLServerPermission[]>("/user-sql-server-permissions/");
}

export async function createSQLServerPermission(data: {
  user_id: number;
  sql_server_id: number;
}): Promise<SQLServerPermission> {
  return apiRequest<SQLServerPermission>("/user-sql-server-permissions/", {
    method: "POST",
    body: data,
  });
}

export async function deleteSQLServerPermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-sql-server-permissions/${id}`, { method: "DELETE" });
}

export async function getDatabasePermissions(): Promise<DatabasePermission[]> {
  return apiRequest<DatabasePermission[]>("/user-database-permissions/");
}

export async function createDatabasePermission(data: {
  user_id: number;
  database_id: number;
}): Promise<DatabasePermission> {
  return apiRequest<DatabasePermission>("/user-database-permissions/", {
    method: "POST",
    body: data,
  });
}

export async function deleteDatabasePermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-database-permissions/${id}`, { method: "DELETE" });
}

export async function getTablePermissions(): Promise<TablePermission[]> {
  return apiRequest<TablePermission[]>("/user-table-permissions/");
}

export async function createTablePermission(data: {
  user_id: number;
  table_id: number;
}): Promise<TablePermission> {
  return apiRequest<TablePermission>("/user-table-permissions/", {
    method: "POST",
    body: data,
  });
}

export async function deleteTablePermission(id: number): Promise<void> {
  return apiRequest<void>(`/user-table-permissions/${id}`, { method: "DELETE" });
}
