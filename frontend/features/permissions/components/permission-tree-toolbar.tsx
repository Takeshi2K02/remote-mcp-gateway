"use client";

import { SearchInput } from "@/components/ui/search-input";
import type { GrantCounts } from "../lib/grant-draft";

interface PermissionTreeToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  counts: GrantCounts;
  /** Expand/collapse do nothing while a search is forcing branches open. */
  isSearching: boolean;
}

export function PermissionTreeToolbar({
  search,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
  onSelectAll,
  onClearAll,
  counts,
  isSearching,
}: PermissionTreeToolbarProps) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          label="Search the access tree"
          placeholder="Search servers, databases, tables..."
          value={search}
          onChange={onSearchChange}
          className="min-w-45 flex-1"
        />
        <ToolbarButton onClick={onExpandAll} disabled={isSearching}>
          Expand All
        </ToolbarButton>
        <ToolbarButton onClick={onCollapseAll} disabled={isSearching}>
          Collapse All
        </ToolbarButton>
        <ToolbarButton onClick={onSelectAll}>Select All</ToolbarButton>
        <ToolbarButton onClick={onClearAll}>Clear All</ToolbarButton>
      </div>

      {/* Counts follow the draft, not what is saved — this is the running
          total of what Save is about to apply. */}
      <p
        aria-live="polite"
        className="mb-3 rounded-md border border-border bg-field px-3.5 py-2 text-[12px] font-semibold text-secondary-foreground"
      >
        Servers: {counts.serversGranted}/{counts.serversTotal} · Databases:{" "}
        {counts.databasesGranted}/{counts.databasesTotal} · Tables:{" "}
        {counts.tablesGranted}/{counts.tablesTotal}
      </p>
    </>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-input px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
