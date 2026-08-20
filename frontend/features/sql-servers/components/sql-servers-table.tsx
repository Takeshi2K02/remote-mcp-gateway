"use client";

import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  DataGrid,
  DataGridCell,
  DataGridHeader,
  DataGridMonoCell,
  DataGridRow,
} from "@/components/ui/data-grid";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { RowAction } from "@/components/ui/row-action";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";
import { formatDate } from "@/lib/format";
import { useServerDialog, useSqlServers } from "../hooks/use-sql-servers";
import { authenticationLabel, type SQLServer } from "../services/sql-servers.service";
import { SqlServerFormDialog } from "./sql-server-form-dialog";

const COLUMNS = "1.4fr 1.8fr 0.6fr 1fr 0.8fr 0.8fr 0.7fr";
const HEADINGS = [
  "Server Name",
  "Host Endpoint",
  "Port",
  "Authentication",
  "Status",
  "Created",
  "Actions",
] as const;

export function SqlServersTable() {
  const {
    servers,
    isLoading,
    error,
    reload,
    saveServer,
    removeServer,
    syncServer,
    isSaving,
    saveError,
    isRemoving,
    isSyncing,
    actionError,
  } = useSqlServers();
  const dialog = useServerDialog();

  const [pendingDelete, setPendingDelete] = useState<SQLServer | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const handleSync = async (server: SQLServer) => {
    setSyncingId(server.id);
    await syncServer(server.id);
    setSyncingId(null);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await removeServer(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        title="SQL Servers"
        description="Manage registered database endpoints and connection pools."
        action={
          <Button size="lg" onClick={dialog.openNew}>
            <Plus aria-hidden="true" strokeWidth={2.2} />
            New Server
          </Button>
        }
      />

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-destructive-bg px-4 py-3 text-[13px] font-medium text-destructive"
        >
          {actionError}
        </p>
      )}

      <SurfaceCard className="overflow-hidden">
        <SurfaceCardHeader
          bordered
          title="Active Registries"
          description="Database server instances currently registered on this gateway"
        />

        {isLoading && <LoadingState label="Loading registered servers…" />}

        {error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !error && servers.length === 0 && (
          <EmptyState
            title="No SQL Servers registered"
            description="Add a server endpoint to start discovering databases."
          >
            <Button size="lg" onClick={dialog.openNew}>
              <Plus aria-hidden="true" strokeWidth={2.2} />
              New Server
            </Button>
          </EmptyState>
        )}

        {!isLoading && !error && servers.length > 0 && (
          <DataGrid columns={COLUMNS} label="Registered SQL Servers" minWidth={1000}>
            <DataGridHeader headings={HEADINGS} alignLastRight />
            {servers.map((server) => (
              <DataGridRow key={server.id}>
                <DataGridCell className="truncate text-[13.5px] font-bold">
                  {server.name}
                </DataGridCell>
                <DataGridMonoCell className="pr-2.5">{server.host}</DataGridMonoCell>
                <DataGridMonoCell>{server.port}</DataGridMonoCell>
                <DataGridCell className="truncate text-[12.5px] text-muted-foreground">
                  {authenticationLabel(server.authentication_type)}
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge status={server.is_active ? "Active" : "Inactive"} />
                </DataGridCell>
                <DataGridMonoCell className="text-subtle-foreground">
                  {formatDate(server.created_at)}
                </DataGridMonoCell>
                <DataGridCell className="flex justify-end gap-1.5">
                  {/* Sync is the only round trip that actually reaches the
                      server, so it doubles as the connection check. */}
                  <RowAction
                    icon={RefreshCw}
                    label={`Sync ${server.name}`}
                    busy={isSyncing && syncingId === server.id}
                    disabled={isSyncing}
                    onClick={() => handleSync(server)}
                  />
                  <RowAction
                    icon={Pencil}
                    label={`Edit ${server.name}`}
                    onClick={() => dialog.openEdit(server)}
                  />
                  <RowAction
                    icon={Trash2}
                    tone="danger"
                    label={`Delete ${server.name}`}
                    onClick={() => setPendingDelete(server)}
                  />
                </DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </SurfaceCard>

      <SqlServerFormDialog
        target={dialog.target}
        onClose={dialog.close}
        onSubmit={saveServer}
        isSaving={isSaving}
        error={saveError}
      />

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        isLoading={isRemoving}
        variant="destructive"
        title="Delete this server?"
        confirmLabel="Delete server"
        message={
          <>
            <strong className="text-foreground">{pendingDelete?.name}</strong> and every
            database, table and permission discovered through it will be removed from the
            gateway. This cannot be undone.
          </>
        }
      />
    </>
  );
}
