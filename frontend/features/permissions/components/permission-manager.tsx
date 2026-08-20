"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-states";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useUsers, type UserRow } from "@/features/users/hooks/use-users";
import { usePermissionTree } from "../hooks/use-permission-tree";
import { PermissionTree } from "./permission-tree";
import { PermissionTreeToolbar } from "./permission-tree-toolbar";
import { PermissionUserList } from "./permission-user-list";

export function PermissionManager() {
  const {
    filteredRows,
    isLoading: isLoadingUsers,
    error: usersError,
    reload: reloadUsers,
    search: userSearch,
    setSearch: setUserSearch,
    isFilteredEmpty,
  } = useUsers();

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const tree = usePermissionTree(selectedUser?.id ?? null);

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = async () => {
    const ok = await tree.save();
    if (!ok) return;
    // The left panel's access badge comes from the users list, so it has to be
    // refetched too or a just-granted user keeps reading "Revoked".
    reloadUsers();
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Review and manage user access control mappings across registered server and database nodes."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PermissionUserList
          users={filteredRows}
          selectedUserId={selectedUser?.id ?? null}
          onSelect={setSelectedUser}
          search={userSearch}
          onSearchChange={setUserSearch}
          isLoading={isLoadingUsers}
          error={usersError}
          onRetry={reloadUsers}
          isFilteredEmpty={isFilteredEmpty}
        />

        {selectedUser === null ? (
          <SurfaceCard className="px-8 py-15 text-center">
            <p className="text-sm font-semibold text-secondary-foreground">
              No user selected
            </p>
            <p className="mt-1.5 text-[13px] text-subtle-foreground">
              Choose a user from the list to review or modify their gateway access.
            </p>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="min-w-0 p-5.5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarInitials
                  size="lg"
                  name={selectedUser.displayName}
                  seed={selectedUser.email}
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">
                    {selectedUser.displayName}
                  </p>
                  <p className="truncate font-mono text-[12px] text-subtle-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {tree.isDirty && (
                  <span className="rounded-full bg-warning-bg px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-warning">
                    Unsaved changes
                  </span>
                )}
                {savedNotice && !tree.isDirty && (
                  <span
                    role="status"
                    className="rounded-full bg-success-bg px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-success"
                  >
                    Permissions saved
                  </span>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={tree.discard}
                  disabled={!tree.isDirty || tree.isSaving}
                >
                  Discard
                </Button>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={!tree.isDirty || tree.isSaving}
                >
                  {tree.isSaving && <Loader2 aria-hidden="true" className="animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </header>

            <h3 className="mb-2.5 text-[13.5px] font-bold">
              Resource Hierarchy Access Tree
            </h3>

            {tree.isLoading && <LoadingState label="Loading access tree…" />}

            {tree.error && <ErrorState message={tree.error} onRetry={tree.reload} />}

            {!tree.isLoading && !tree.error && (
              <>
                <PermissionTreeToolbar
                  search={tree.search}
                  onSearchChange={tree.setSearch}
                  onExpandAll={tree.expandAll}
                  onCollapseAll={tree.collapseAll}
                  onSelectAll={tree.selectAll}
                  onClearAll={tree.clearAll}
                  counts={tree.counts}
                  isSearching={tree.search.trim().length > 0}
                />

                {tree.saveError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-md bg-destructive-bg px-3.5 py-2.5 text-[12.5px] font-medium text-destructive"
                  >
                    {tree.saveError}
                  </p>
                )}

                <PermissionTree
                  tree={tree.visibleTree}
                  draft={tree.draft}
                  expandedServers={tree.expandedServers}
                  expandedDatabases={tree.expandedDatabases}
                  onToggleServerExpanded={tree.toggleServerExpanded}
                  onToggleDatabaseExpanded={tree.toggleDatabaseExpanded}
                  onToggleServer={tree.toggleServer}
                  onToggleDatabase={tree.toggleDatabase}
                  onToggleTable={tree.toggleTable}
                  isSearching={tree.search.trim().length > 0}
                />
              </>
            )}
          </SurfaceCard>
        )}
      </div>
    </>
  );
}
