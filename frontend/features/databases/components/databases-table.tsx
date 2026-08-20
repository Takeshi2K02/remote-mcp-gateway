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
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";
import { formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDatabases } from "../hooks/use-databases";

const COLUMNS = "1.4fr 1.4fr 0.7fr 1fr 0.5fr";
const HEADINGS = ["Database Name", "SQL Server", "Status", "Last Synced", ""] as const;

export function DatabasesTable() {
  const {
    rows,
    hasServers,
    lastSyncedAt,
    isLoading,
    error,
    reload,
    syncAll,
    isSyncing,
    syncError,
  } = useDatabases();

  // Per-server failures from the last run. Kept beside the sync error rather
  // than replacing it: a run can partly succeed, and the rows that did land
  // are already on screen.
  const [failures, setFailures] = useState<string[]>([]);

  const handleSync = async () => {
    setFailures(await syncAll());
  };

  return (
    <>
      <PageHeader
        title="Databases"
        description="Manage registered databases across active SQL Server nodes."
        action={
          <Button size="lg" onClick={handleSync} disabled={isSyncing || !hasServers}>
            <RefreshCw aria-hidden="true" className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : "Sync Databases"}
          </Button>
        }
      />

      {!isLoading && !error && (
        <p className="mb-4 text-[13px] text-muted-foreground">
          {pluralize(rows.length, "database")}
          {" · Last synced: "}
          {lastSyncedAt ? formatDateTime(lastSyncedAt) : "never"}
        </p>
      )}

      {(syncError || failures.length > 0) && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-destructive-bg px-4 py-3 text-[13px] text-destructive"
        >
          <p className="font-semibold">Some servers could not be synced</p>
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
          title="Discovered Databases"
          description="SQL Server databases automatically discovered on this gateway"
        />

        {isLoading && <LoadingState label="Loading databases…" />}

        {error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !error && rows.length === 0 && (
          <EmptyState
            title="No databases discovered"
            description={
              hasServers
                ? "Run a sync to discover the databases on your registered servers."
                : "Register a SQL Server first, then run a sync."
            }
          />
        )}

        {!isLoading && !error && rows.length > 0 && (
          <DataGrid columns={COLUMNS} label="Discovered databases" minWidth={820}>
            <DataGridHeader headings={HEADINGS} />
            {rows.map((row) => (
              <DataGridRow key={row.id}>
                <DataGridCell className="truncate text-[13.5px] font-bold">
                  {row.name}
                </DataGridCell>
                <DataGridMonoCell>{row.serverName}</DataGridMonoCell>
                <DataGridCell>
                  <StatusBadge status={row.is_active ? "Active" : "Inactive"} />
                </DataGridCell>
                <DataGridMonoCell className="text-subtle-foreground">
                  {row.last_synced_at ? formatDateTime(row.last_synced_at) : "Never"}
                </DataGridMonoCell>
                <DataGridCell />
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </SurfaceCard>
    </>
  );
}
