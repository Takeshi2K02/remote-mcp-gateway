"use client";

import { useCallback, useMemo } from "react";
import {
  getSQLServers,
  syncSQLServer,
  type SQLServer,
} from "@/features/sql-servers/services/sql-servers.service";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useMutation } from "@/lib/hooks/use-mutation";
import { getDatabases, type DatabaseModel } from "../services/databases.service";

/** A database row with its server's name folded in, ready to render. */
export interface DatabaseRow extends DatabaseModel {
  serverName: string;
}

async function fetchDatabasePage(): Promise<{
  databases: DatabaseModel[];
  servers: SQLServer[];
}> {
  // The table shows the owning server's name but `/databases/` returns only
  // `sql_server_id`, so both collections are needed before the first row can
  // be drawn — fetched together rather than in a waterfall.
  const [databases, servers] = await Promise.all([getDatabases(), getSQLServers()]);
  return { databases, servers };
}

/**
 * Runs every registered server's discovery pass in turn.
 *
 * Sequential on purpose: each pass opens a real connection and writes rows,
 * and firing them all at once against one busy SQL instance is how the sync
 * starts timing out. Individual failures are collected rather than aborting
 * the run, so one unreachable legacy box does not block the rest.
 */
async function syncAllServers(servers: SQLServer[]): Promise<string[]> {
  const failures: string[] = [];

  for (const server of servers) {
    try {
      await syncSQLServer(server.id);
    } catch (cause) {
      failures.push(
        `${server.name}: ${cause instanceof Error ? cause.message : "sync failed"}`
      );
    }
  }

  return failures;
}

export function useDatabases() {
  const { data, isLoading, error, reload } = useAsyncData(fetchDatabasePage);
  const sync = useMutation(syncAllServers);

  const servers = useMemo(() => data?.servers ?? [], [data]);

  const rows = useMemo<DatabaseRow[]>(() => {
    const serverNames = new Map(servers.map((server) => [server.id, server.name]));
    return (data?.databases ?? []).map((database) => ({
      ...database,
      serverName: serverNames.get(database.sql_server_id) ?? "Unknown server",
    }));
  }, [data, servers]);

  const lastSyncedAt = useMemo(() => {
    const timestamps = rows
      .map((row) => row.last_synced_at)
      .filter((value): value is string => Boolean(value));
    if (timestamps.length === 0) return null;
    // The page reports one "last synced" for the whole set, so the most recent
    // pass across every database is the honest answer.
    return timestamps.reduce((latest, value) => (value > latest ? value : latest));
  }, [rows]);

  const syncAll = useCallback(async () => {
    const failures = await sync.run(servers);
    reload();
    return failures ?? [];
  }, [sync, servers, reload]);

  return {
    rows,
    hasServers: servers.length > 0,
    lastSyncedAt,
    isLoading,
    error,
    reload,
    syncAll,
    isSyncing: sync.isPending,
    syncError: sync.error,
  };
}
