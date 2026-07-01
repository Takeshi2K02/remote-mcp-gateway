import { apiRequest } from "@/lib/api/http-client";
import { User } from "../types/user.types";

export async function getUsers(): Promise<User[]> {
  return apiRequest<User[]>("/users");
}

export async function getUser(id: number): Promise<User> {
  return apiRequest<User>(`/users/${id}`);
}

export async function updateUser(
  id: number,
  data: Partial<Pick<User, "is_active" | "is_admin">>
): Promise<User> {
  return apiRequest<User>(`/users/${id}`, {
    method: "PATCH",
    body: data,
  });
}
