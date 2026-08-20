"use client";

import { ChevronDown } from "lucide-react";
import {
  DataGrid,
  DataGridCell,
  DataGridHeader,
  DataGridMonoCell,
  DataGridRow,
} from "@/components/ui/data-grid";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AUDIT_STATUS_FILTERS,
  useAuditLogs,
  useExpandedRows,
} from "../hooks/use-audit-logs";
import { AuditLogDetail } from "./audit-log-detail";

const COLUMNS = "1.3fr 1.4fr 1.8fr 0.7fr 1.2fr 0.4fr";
const HEADINGS = ["Timestamp", "Actor", "Target", "Result", "Action", ""] as const;

export function AuditLogsTable() {
  const {
    filteredLogs,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isFilteredEmpty,
  } = useAuditLogs();
  const { expandedIds, toggle } = useExpandedRows();

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5.5 py-4.5">
        <SearchInput
          label="Search audit events"
          placeholder="Search actor, action, or target..."
          value={search}
          onChange={setSearch}
          className="max-w-85 flex-1"
        />
        <FilterTabs
          label="Filter audit events by result"
          options={AUDIT_STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {isLoading && <LoadingState label="Loading audit events…" />}

      {error && <ErrorState message={error} onRetry={reload} />}

      {!isLoading && !error && filteredLogs.length === 0 && (
        <EmptyState
          title={isFilteredEmpty ? "No matching audit events" : "No audit events recorded"}
          description={
            isFilteredEmpty
              ? "Adjust your search or filters to see more results."
              : "Events appear here as clients call gateway tools."
          }
        />
      )}

      {!isLoading && !error && filteredLogs.length > 0 && (
        <DataGrid columns={COLUMNS} label="Audit events" minWidth={960}>
          <DataGridHeader headings={HEADINGS} />
          {filteredLogs.map((log) => {
            const isExpanded = expandedIds.has(log.id);
            return (
              <div key={log.id}>
                <DataGridRow onSelect={() => toggle(log.id)} aria-expanded={isExpanded}>
                  <DataGridMonoCell className="text-[12px] text-subtle-foreground">
                    {formatDateTime(log.created_at)}
                  </DataGridMonoCell>
                  <DataGridCell className="truncate text-[13px] font-semibold">
                    {log.actor_name}
                  </DataGridCell>
                  <DataGridMonoCell className="pr-2">{log.target}</DataGridMonoCell>
                  <DataGridCell>
                    <StatusBadge status={titleCase(log.status)} size="sm" />
                  </DataGridCell>
                  <DataGridCell className="truncate font-mono text-[12px] text-link">
                    {log.action}
                  </DataGridCell>
                  <DataGridCell className="text-right">
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "ml-auto h-3.5 w-3.5 text-subtle-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </DataGridCell>
                </DataGridRow>
                {isExpanded && <AuditLogDetail log={log} />}
              </div>
            );
          })}
        </DataGrid>
      )}
    </SurfaceCard>
  );
}
