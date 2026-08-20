"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getDatabases,
  syncDatabaseTables,
  type DatabaseModel,
} from "@/features/databases/services/databases.service";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useMutation } from "@/lib/hooks/use-mutation";
import { getDatabaseTables, type DatabaseTable } from "../services/tables.service";

/**
 * "Syncing" and "Error" are not states the API can report — a table row is
 * active or it is not — so the filter offers only what the data can answer.
 */
export const TABLE_STATUS_FILTERS = ["All", "Active", "Inactive"] as const;
export type TableStatusFilter = (typeof TABLE_STATUS_FILTERS)[number];

export const TABLES_PAGE_SIZE = 10;

export interface DatabaseTableRow extends DatabaseTable {
  databaseName: string;
  /** "sales.orders" — how the table is searched for and displayed. */
  qualifiedName: string;
}

async function fetchTablesPage(): Promise<{
  tables: DatabaseTable[];
  databases: DatabaseModel[];
}> {
  const [tables, databases] = await Promise.all([getDatabaseTables(), getDatabases()]);
  return { tables, databases };
}

async function syncAllDatabases(databases: DatabaseModel[]): Promise<string[]> {
  const failures: string[] = [];

  // Sequential for the same reason as the server sync: each pass holds a real
  // connection open while it enumerates schemas.
  for (const database of databases) {
    try {
      await syncDatabaseTables(database.id);
    } catch (cause) {
      failures.push(
        `${database.name}: ${cause instanceof Error ? cause.message : "sync failed"}`
      );
    }
  }

  return failures;
}

export function useDatabaseTables() {
  const { data, isLoading, error, reload } = useAsyncData(fetchTablesPage);
  const sync = useMutation(syncAllDatabases);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>("All");

  const databases = useMemo(() => data?.databases ?? [], [data]);

  const rows = useMemo<DatabaseTableRow[]>(() => {
    const names = new Map(databases.map((database) => [database.id, database.name]));
    return (data?.tables ?? []).map((table) => ({
      ...table,
      databaseName: names.get(table.database_id) ?? "Unknown database",
      qualifiedName: `${table.schema_name}.${table.table_name}`,
    }));
  }, [data, databases]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "All") {
        const isActive = statusFilter === "Active";
        if (row.is_active !== isActive) return false;
      }
      if (!query) return true;

      return (
        row.qualifiedName.toLowerCase().includes(query) ||
        row.databaseName.toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter]);

  const lastSyncedAt = useMemo(() => {
    const timestamps = rows
      .map((row) => row.last_synced_at)
      .filter((value): value is string => Boolean(value));
    if (timestamps.length === 0) return null;
    return timestamps.reduce((latest, value) => (value > latest ? value : latest));
  }, [rows]);

  const syncAll = useCallback(async () => {
    const failures = await sync.run(databases);
    reload();
    return failures ?? [];
  }, [sync, databases, reload]);

  return {
    rows,
    filteredRows,
    hasDatabases: databases.length > 0,
    lastSyncedAt,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    syncAll,
    isSyncing: sync.isPending,
    syncError: sync.error,
    isFilteredEmpty: !isLoading && !error && rows.length > 0 && filteredRows.length === 0,
  };
}
