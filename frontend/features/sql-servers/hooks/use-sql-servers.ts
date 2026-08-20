"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useMutation } from "@/lib/hooks/use-mutation";
import {
  createSQLServer,
  deleteSQLServer,
  getSQLServers,
  syncSQLServer,
  updateSQLServer,
  type SQLServer,
  type SQLServerInput,
} from "../services/sql-servers.service";

const fetchServers = () => getSQLServers();

/**
 * The SQL Servers page's data layer: the list, plus the four writes that
 * change it. Each write reloads the list on success rather than patching local
 * state, because a sync also changes rows this page does not own.
 */
export function useSqlServers() {
  const { data, isLoading, error, reload } = useAsyncData(fetchServers);

  const servers = useMemo(() => data ?? [], [data]);

  const create = useMutation(createSQLServer);
  const update = useMutation(
    useCallback(
      (id: number, input: Partial<SQLServerInput>) => updateSQLServer(id, input),
      []
    )
  );
  const remove = useMutation(deleteSQLServer);
  const sync = useMutation(syncSQLServer);

  const saveServer = useCallback(
    async (input: SQLServerInput, id?: number) => {
      const result = id ? await update.run(id, input) : await create.run(input);
      if (result) reload();
      return result !== null;
    },
    [create, update, reload]
  );

  const removeServer = useCallback(
    async (id: number) => {
      // DELETE resolves to undefined, so success is "no error was recorded"
      // rather than a truthy result.
      await remove.run(id);
      reload();
    },
    [remove, reload]
  );

  const syncServer = useCallback(
    async (id: number) => {
      const result = await sync.run(id);
      if (result) reload();
      return result;
    },
    [sync, reload]
  );

  return {
    servers,
    isLoading,
    error,
    reload,
    saveServer,
    removeServer,
    syncServer,
    isSaving: create.isPending || update.isPending,
    saveError: create.error ?? update.error,
    isRemoving: remove.isPending,
    isSyncing: sync.isPending,
    /** Surfaced as a page-level banner; row actions have no space for it. */
    actionError: remove.error ?? sync.error,
  };
}

/** Which server the form dialog is editing, or `"new"` for a blank one. */
export function useServerDialog() {
  const [target, setTarget] = useState<SQLServer | "new" | null>(null);

  return {
    target,
    openNew: useCallback(() => setTarget("new"), []),
    openEdit: useCallback((server: SQLServer) => setTarget(server), []),
    close: useCallback(() => setTarget(null), []),
  };
}

export type { SQLServer };
