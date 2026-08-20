import { env } from "@/lib/config/env";
import { getAppToken } from "@/lib/auth/token-storage";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
};

/**
 * Carries the HTTP status alongside the message so callers can tell "you are
 * signed out" from "that row is gone" from "the gateway is down" — the UI
 * shows a different empty/error treatment for each.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  { authenticated = true, headers, body, ...options }: RequestOptions = {}
): Promise<T> {
  const token = authenticated ? getAppToken() : null;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  // 204 is the documented success for the permission sync and every DELETE.
  // Parsing those as JSON threw on an empty body and surfaced as a failure to
  // the caller even though the write had gone through.
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * FastAPI puts the useful text in `detail`, which is either a string or the
 * validation-error array. Anything else falls back to the status line, since
 * showing "[object Object]" to an admin is worse than showing nothing.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const payload = await response.json();
    const detail = (payload as { detail?: unknown })?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item as { msg?: string })?.msg)
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length > 0) return messages.join("; ");
    }
    return fallback;
  } catch {
    return fallback;
  }
}
