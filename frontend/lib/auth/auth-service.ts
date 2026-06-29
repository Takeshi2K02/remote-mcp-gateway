import { env } from "@/lib/config/env";

export function redirectToMicrosoftLogin(): void {
  window.location.href = `${env.apiBaseUrl}/auth/login`;
}