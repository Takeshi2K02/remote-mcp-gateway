"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
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
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { useUsers, type UserRow } from "../hooks/use-users";

const COLUMNS = "1.4fr 1.6fr 1fr 0.6fr 0.7fr 0.7fr 1.1fr 0.8fr 0.9fr";
const HEADINGS = [
  "Full Name",
  "Email Address",
  "Entra Object ID",
  "Status",
  "Role",
  "Access",
  "Last Login",
  "Created",
  "Actions",
] as const;

export function UsersTable() {
  const {
    filteredRows,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    setUserActive,
    isUpdating,
    updateError,
    isFilteredEmpty,
  } = useUsers();

  const [pendingRevoke, setPendingRevoke] = useState<UserRow | null>(null);

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    await setUserActive(pendingRevoke.id, false);
    setPendingRevoke(null);
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administer gateway user accounts, status, security policies, and access credentials."
      />

      {updateError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-destructive-bg px-4 py-3 text-[13px] font-medium text-destructive"
        >
          {updateError}
        </p>
      )}

      <SurfaceCard className="overflow-hidden">
        <SurfaceCardHeader
          bordered
          title="User Directory"
          description="Authorized credentials synchronized via Microsoft Entra ID IDP"
          action={
            <SearchInput
              label="Search users"
              placeholder="Search by name or email..."
              value={search}
              onChange={setSearch}
              className="w-65"
            />
          }
        />

        {isLoading && <LoadingState label="Loading user directory…" />}

        {error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !error && filteredRows.length === 0 && (
          <EmptyState
            title={isFilteredEmpty ? "No users match this search" : "No users yet"}
            description="Users sync automatically from your Entra ID tenant on first sign-in."
          />
        )}

        {!isLoading && !error && filteredRows.length > 0 && (
          <DataGrid columns={COLUMNS} label="Gateway users" minWidth={1200}>
            <DataGridHeader headings={HEADINGS} alignLastRight />
            {filteredRows.map((row) => (
              <DataGridRow key={row.id} density="compact">
                <DataGridCell className="flex items-center gap-2.5">
                  <AvatarInitials name={row.displayName} seed={row.email} />
                  <span className="truncate text-[13px] font-bold">
                    {row.displayName}
                  </span>
                </DataGridCell>
                <DataGridMonoCell className="pr-2">{row.email}</DataGridMonoCell>
                <DataGridMonoCell className="text-[12px] text-subtle-foreground">
                  {shortId(row.entra_object_id)}
                </DataGridMonoCell>
                <DataGridCell>
                  <StatusBadge status={row.status} size="sm" />
                </DataGridCell>
                <DataGridCell>
                  {/* "Standard" is not a status word, so its tone is stated
                      rather than derived. */}
                  <StatusBadge
                    status={row.role}
                    size="sm"
                    tone={row.role === "Admin" ? "info" : "neutral"}
                  />
                </DataGridCell>
                <DataGridCell>
                  <StatusBadge status={row.access} size="sm" />
                </DataGridCell>
                <DataGridMonoCell className="text-[12px] text-subtle-foreground">
                  {row.last_login_at ? formatDateTime(row.last_login_at) : "Never"}
                </DataGridMonoCell>
                <DataGridMonoCell className="text-[12px] text-subtle-foreground">
                  {formatDate(row.created_at)}
                </DataGridMonoCell>
                <DataGridCell className="flex justify-end gap-1.5">
                  <Link
                    href="/permissions"
                    title={`Manage permissions for ${row.displayName}`}
                    aria-label={`Manage permissions for ${row.displayName}`}
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[7px] bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Shield aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </Link>
                  {row.is_active ? (
                    <RowAction
                      icon={UserX}
                      tone="danger"
                      label={`Deactivate ${row.displayName}`}
                      disabled={isUpdating}
                      onClick={() => setPendingRevoke(row)}
                    />
                  ) : (
                    <RowAction
                      icon={UserCheck}
                      label={`Reactivate ${row.displayName}`}
                      disabled={isUpdating}
                      onClick={() => setUserActive(row.id, true)}
                    />
                  )}
                </DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </SurfaceCard>

      <ConfirmationModal
        isOpen={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={handleRevoke}
        isLoading={isUpdating}
        variant="destructive"
        title="Deactivate this account?"
        confirmLabel="Deactivate"
        message={
          <>
            <strong className="text-foreground">{pendingRevoke?.displayName}</strong> will
            be signed out and refused at the gateway until the account is reactivated.
            Their existing grants are kept.
          </>
        }
      />
    </>
  );
}
