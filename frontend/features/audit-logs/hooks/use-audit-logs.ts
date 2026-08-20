"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { getAuditLogs, type AuditLogEntry } from "../services/audit-logs.service";

export const AUDIT_STATUS_FILTERS = ["All", "Success", "Failed"] as const;
export type AuditStatusFilter = (typeof AUDIT_STATUS_FILTERS)[number];

const fetchAuditLogs = () => getAuditLogs();

/**
 * Fetching plus the search/filter state for the Audit Logs page.
 *
 * The list is capped server-side at a few hundred rows, so filtering runs
 * client-side: a round trip per keystroke would be slower and would lose the
 * expanded-row state on every refetch.
 */
export function useAuditLogs() {
  const { data, isLoading, error, reload } = useAsyncData(fetchAuditLogs);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>("All");

  const logs = useMemo(() => data ?? [], [data]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesStatus =
        statusFilter === "All" || log.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchesStatus) return false;
      if (!query) return true;

      return (
        log.actor_name.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.target.toLowerCase().includes(query)
      );
    });
  }, [logs, search, statusFilter]);

  return {
    logs,
    filteredLogs,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    /** True when rows exist but none survive the current search/filter. */
    isFilteredEmpty: !isLoading && !error && logs.length > 0 && filteredLogs.length === 0,
  };
}

/** Which rows have their detail panel open. Ids, so a refetch cannot shift it. */
export function useExpandedRows() {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return { expandedIds, toggle };
}

export type { AuditLogEntry };
