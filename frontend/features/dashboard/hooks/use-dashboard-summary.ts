"use client";

import { useMemo } from "react";
import { getDatabases } from "@/features/databases/services/databases.service";
import { getSQLServers } from "@/features/sql-servers/services/sql-servers.service";
import { getDatabaseTables } from "@/features/tables/services/tables.service";
import { getUsers } from "@/features/users/services/users.service";
import { useAsyncData } from "@/lib/hooks/use-async-data";

export interface DashboardSummary {
  servers: number;
  databases: number;
  tables: number;
  activeUsers: number;
  /** Users holding at least one grant — the donut's filled arc. */
  granted: number;
  restricted: number;
  totalUsers: number;
  grantedPercent: number;
}

async function fetchSummary(): Promise<DashboardSummary> {
  // Four independent collections, one round trip's worth of latency. There is
  // no aggregate endpoint, and adding one for four counts would be more
  // surface area than it saves.
  const [servers, databases, tables, users] = await Promise.all([
    getSQLServers(),
    getDatabases(),
    getDatabaseTables(),
    getUsers(),
  ]);

  const granted = users.filter((user) => user.has_permissions).length;

  return {
    servers: servers.length,
    databases: databases.length,
    tables: tables.length,
    activeUsers: users.filter((user) => user.is_active).length,
    granted,
    restricted: users.length - granted,
    totalUsers: users.length,
    grantedPercent: users.length === 0 ? 0 : Math.round((granted / users.length) * 100),
  };
}

export function useDashboardSummary() {
  const { data, isLoading, error, reload } = useAsyncData(fetchSummary);

  const summary = useMemo<DashboardSummary>(
    () =>
      data ?? {
        servers: 0,
        databases: 0,
        tables: 0,
        activeUsers: 0,
        granted: 0,
        restricted: 0,
        totalUsers: 0,
        grantedPercent: 0,
      },
    [data]
  );

  return { summary, hasData: data !== null, isLoading, error, reload };
}
