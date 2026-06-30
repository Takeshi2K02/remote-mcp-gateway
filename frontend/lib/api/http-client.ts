import { env } from "@/lib/config/env";
import { getAppToken } from "@/lib/auth/token-storage";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  {
    authenticated = true,
    headers,
    body,
    ...options
  }: RequestOptions = {}
): Promise<T> {
  const token = authenticated ? getAppToken() : null;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}