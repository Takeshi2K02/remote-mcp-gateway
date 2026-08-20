"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridCell,
  DataGridHeader,
  DataGridMonoCell,
  DataGridRow,
} from "@/components/ui/data-grid";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";
import { formatDateTime, pluralize } from "@/lib/format";
import { usePagination } from "@/lib/hooks/use-pagination";
import { cn } from "@/lib/utils";
import {
  TABLE_STATUS_FILTERS,
  TABLES_PAGE_SIZE,
  useDatabaseTables,
} from "../hooks/use-database-tables";

const COLUMNS = "0.8fr 1.6fr 1.4fr 0.7fr 1fr 0.5fr";
const HEADINGS = ["Schema", "Table Name", "Database", "Status", "Last Synced", ""] as const;

export function TablesTable() {
  const {
    rows,
    filteredRows,
    hasDatabases,
    lastSyncedAt,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    syncAll,
    isSyncing,
    syncError,
    isFilteredEmpty,
  } = useDatabaseTables();

  const pagination = usePagination(filteredRows, TABLES_PAGE_SIZE);
  const [failures, setFailures] = useState<string[]>([]);

  const handleSync = async () => {
    setFailures(await syncAll());
  };

  return (
    <>
      <PageHeader
        title="Tables"
        description="Manage and inspect registered database tables and access mappings."
        action={
          <Button size="lg" onClick={handleSync} disabled={isSyncing || !hasDatabases}>
            <RefreshCw aria-hidden="true" className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : "Sync Tables"}
          </Button>
        }
      />

      {!isLoading && !error && (
        <p className="mb-4 text-[13px] text-muted-foreground">
          {pluralize(rows.length, "table")}
          {" · Last synced: "}
          {lastSyncedAt ? formatDateTime(lastSyncedAt) : "never"}
        </p>
      )}

      {(syncError || failures.length > 0) && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-destructive-bg px-4 py-3 text-[13px] text-destructive"
        >
          <p className="font-semibold">Some databases could not be synced</p>
          <ul className="mt-1 list-inside list-disc font-mono text-[12px]">
            {syncError && <li>{syncError}</li>}
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      )}

      <SurfaceCard className="overflow-hidden">
        <SurfaceCardHeader
          bordered
          title="Discovered Tables"
          description="Database table schemas automatically discovered and exposed to client query requests"
          action={
            <SearchInput
              label="Search tables"
              placeholder="Search schema or table..."
              value={search}
              onChange={setSearch}
              className="w-57.5"
            />
          }
        />

        {!isLoading && !error && rows.length > 0 && (
          <div className="px-5.5 pt-3.5">
            <FilterTabs
              label="Filter tables by status"
              options={TABLE_STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        )}

        {isLoading && <LoadingState label="Loading tables…" />}

        {error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !error && filteredRows.length === 0 && (
          <EmptyState
            title={isFilteredEmpty ? "No tables match this search" : "No tables discovered"}
            description={
              isFilteredEmpty
                ? "Try a different schema or table name, or clear the filters."
                : hasDatabases
                  ? "Run a sync to discover the tables in your registered databases."
                  : "Register a SQL Server and sync its databases first."
            }
          />
        )}

        {!isLoading && !error && filteredRows.length > 0 && (
          <>
            <DataGrid columns={COLUMNS} label="Discovered tables" minWidth={900}>
              <DataGridHeader headings={HEADINGS} className="mt-2 pt-3.5 pb-2.5" />
              {pagination.items.map((row) => (
                <DataGridRow key={row.id} density="compact">
                  <DataGridMonoCell>{row.schema_name}</DataGridMonoCell>
                  <DataGridCell className="truncate font-mono text-[13.5px] font-bold">
                    {row.table_name}
                  </DataGridCell>
                  <DataGridCell className="truncate text-[12.5px] text-muted-foreground">
                    {row.databaseName}
                  </DataGridCell>
                  <DataGridCell>
                    <StatusBadge
                      size="sm"
                      status={row.is_active ? "Active" : "Inactive"}
                    />
                  </DataGridCell>
                  <DataGridMonoCell className="text-[12px] text-subtle-foreground">
                    {row.last_synced_at ? formatDateTime(row.last_synced_at) : "Never"}
                  </DataGridMonoCell>
                  <DataGridCell />
                </DataGridRow>
              ))}
            </DataGrid>
            <PaginationFooter pagination={pagination} noun="tables" />
          </>
        )}
      </SurfaceCard>
    </>
  );
}
