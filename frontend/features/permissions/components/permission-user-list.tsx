"use client";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/features/users/hooks/use-users";

interface PermissionUserListProps {
  users: readonly UserRow[];
  selectedUserId: number | null;
  onSelect: (user: UserRow) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** True when rows exist but the search excludes all of them. */
  isFilteredEmpty: boolean;
}

/** Left panel: pick whose access the tree on the right is showing. */
export function PermissionUserList({
  users,
  selectedUserId,
  onSelect,
  search,
  onSearchChange,
  isLoading,
  error,
  onRetry,
  isFilteredEmpty,
}: PermissionUserListProps) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border px-5 py-4.5">
        <h2 className="mb-2 text-sm font-bold text-foreground">Select User</h2>
        <SearchInput
          label="Search users"
          placeholder="Search users..."
          value={search}
          onChange={onSearchChange}
        />
      </div>

      {isLoading && <LoadingState label="Loading users…" />}
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          title={isFilteredEmpty ? "No users match this search" : "No users yet"}
          description="Users sync from your Entra ID tenant on first sign-in."
        />
      )}

      {!isLoading && !error && users.length > 0 && (
        <ul className="max-h-130 overflow-y-auto">
          {users.map((user) => {
            const isSelected = user.id === selectedUserId;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(user)}
                  className={cn(
                    "flex w-full items-center gap-2.5 border-b border-row-border px-4 py-3 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                    isSelected ? "bg-accent" : "hover:bg-row-hover"
                  )}
                >
                  <AvatarInitials
                    name={user.displayName}
                    seed={user.email}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-[11.5px] text-subtle-foreground">
                      {user.email}
                    </span>
                  </span>
                  <StatusBadge
                    status={user.access}
                    size="sm"
                    className="shrink-0 px-2 text-[10.5px]"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceCard>
  );
}
