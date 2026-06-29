const APP_TOKEN_KEY = "app_token";

export function getAppToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(APP_TOKEN_KEY);
}

export function setAppToken(token: string): void {
  localStorage.setItem(APP_TOKEN_KEY, token);
}

export function clearAppToken(): void {
  localStorage.removeItem(APP_TOKEN_KEY);
}