"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/http-client";

export interface HealthCheck {
  /** Three-letter tag shown in the square badge. */
  tag: string;
  name: string;
  /** Secondary line — environment, provider, whatever the probe reports. */
  detail: string;
  status: "Checking" | "Healthy" | "Connected" | "Unhealthy" | "Disconnected";
}

const INITIAL_CHECKS: HealthCheck[] = [
  { tag: "API", name: "API Gateway", detail: "checking…", status: "Checking" },
  { tag: "DB", name: "Central Database", detail: "Azure SQL", status: "Checking" },
];

/**
 * Live probes of the two endpoints the gateway actually exposes.
 *
 * The design's list also showed the MCP registry, the identity provider and
 * the audit writer. Those have no health endpoint — reporting them as
 * "Healthy" would be a decoration that says nothing, so the card shows only
 * what is really being measured.
 */
export function useSystemHealth(pollIntervalMs = 30_000) {
  const [checks, setChecks] = useState<HealthCheck[]>(INITIAL_CHECKS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    const [api, database] = await Promise.all([probeApi(), probeDatabase()]);
    setChecks([api, database]);

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // Probing on mount and on a timer — both external signals.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = window.setInterval(refresh, pollIntervalMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return { checks, isRefreshing, refresh };
}

async function probeApi(): Promise<HealthCheck> {
  try {
    const result = await apiRequest<{ status: string; environment?: string }>("/health", {
      authenticated: false,
    });
    return {
      tag: "API",
      name: "API Gateway",
      detail: result.environment ? `env: ${result.environment}` : "reachable",
      status: result.status === "ok" ? "Healthy" : "Unhealthy",
    };
  } catch {
    return { tag: "API", name: "API Gateway", detail: "unreachable", status: "Unhealthy" };
  }
}

async function probeDatabase(): Promise<HealthCheck> {
  try {
    const result = await apiRequest<{ database: string }>("/db-health", {
      authenticated: false,
    });
    return {
      tag: "DB",
      name: "Central Database",
      detail: "Azure SQL",
      status: result.database === "connected" ? "Connected" : "Disconnected",
    };
  } catch {
    return {
      tag: "DB",
      name: "Central Database",
      detail: "Azure SQL",
      status: "Disconnected",
    };
  }
}
