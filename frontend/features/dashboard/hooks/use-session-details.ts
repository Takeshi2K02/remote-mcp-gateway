"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { getAppToken } from "@/lib/auth/token-storage";

interface TokenClaims {
  /** Entra object id of the signed-in principal. */
  sub?: string;
  /** Seconds since epoch. */
  iat?: number;
  exp?: number;
}

export interface SessionDetails {
  userName: string | null;
  identity: string | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  /** Whole minutes remaining, floored; 0 once the token is past its expiry. */
  minutesRemaining: number | null;
}

/**
 * What the console can honestly say about the current session.
 *
 * The times come from the app token's own `iat`/`exp` claims rather than a
 * server call — they are the values the gateway will actually enforce, and
 * reading them locally means the bar is right even while the network is down.
 *
 * The signature is not verified here: this is display only, and the gateway
 * rejects a forged token on the next request regardless of what this shows.
 */
export function useSessionDetails(): SessionDetails {
  const { user } = useAuth();
  const [claims, setClaims] = useState<TokenClaims | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // localStorage is not readable during the server render, so the token is
    // picked up after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaims(decodeClaims(getAppToken()));
  }, []);

  useEffect(() => {
    // "Expires in 27 min" has to keep counting down; a minute's resolution
    // needs no faster tick than this.
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return useMemo(() => {
    const startedAt = claims?.iat ? new Date(claims.iat * 1000) : null;
    const expiresAt = claims?.exp ? new Date(claims.exp * 1000) : null;

    return {
      userName: user?.full_name || user?.email || null,
      identity: claims?.sub ?? user?.entra_object_id ?? null,
      startedAt,
      expiresAt,
      minutesRemaining: expiresAt
        ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 60_000))
        : null,
    };
  }, [claims, user, now]);
}

function decodeClaims(token: string | null): TokenClaims | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    // JWTs are base64url; atob only speaks base64, and the padding is dropped.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as TokenClaims;
  } catch {
    // A token we cannot read is not worth failing the dashboard over — the bar
    // falls back to what the user profile already gives us.
    return null;
  }
}
