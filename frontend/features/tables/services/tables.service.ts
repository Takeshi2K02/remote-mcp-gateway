import { apiRequest } from "@/lib/api/http-client";

export interface DatabaseTable {
  id: number;
  database_id: number;
  schema_name: string;
  table_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  return apiRequest<DatabaseTable[]>("/database-tables");
}

export async function createDatabaseTable(data: Omit<DatabaseTable, "id" | "is_active" | "created_at">): Promise<DatabaseTable> {
  return apiRequest<DatabaseTable>("/database-tables", {
    method: "POST",
    body: data,
  });
}

export async function updateDatabaseTable(
  id: number,
  data: Partial<Omit<DatabaseTable, "id" | "created_at">>
): Promise<DatabaseTable> {
  return apiRequest<DatabaseTable>(`/database-tables/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDatabaseTable(id: number): Promise<void> {
  return apiRequest<void>(`/database-tables/${id}`, {
    method: "DELETE",
  });
}

