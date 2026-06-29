import { apiRequest } from "@/lib/api/http-client";

export interface CurrentUser {
  id: number;
  entra_object_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/auth/me");
}