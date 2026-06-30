import { apiRequest } from "@/lib/api/http-client";

export interface DatabaseModel {
  id: number;
  sql_server_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export async function getDatabases(): Promise<DatabaseModel[]> {
  return apiRequest<DatabaseModel[]>("/databases");
}

export async function createDatabase(data: Omit<DatabaseModel, "id" | "created_at">): Promise<DatabaseModel> {
  return apiRequest<DatabaseModel>("/databases", {
    method: "POST",
    body: data,
  });
}

export async function updateDatabase(
  id: number,
  data: Partial<Omit<DatabaseModel, "id" | "created_at">>
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

