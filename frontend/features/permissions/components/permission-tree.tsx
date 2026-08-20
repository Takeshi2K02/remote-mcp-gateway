"use client";

import { ChevronDown, ChevronRight, Database, Server } from "lucide-react";
import { EmptyState } from "@/components/ui/data-states";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  databaseState,
  serverState,
  tableState,
  type GrantDraft,
} from "../lib/grant-draft";
import { qualifiedTableName } from "../lib/tree-search";
import type { DatabaseNode, ServerNode } from "../types/permission-tree.types";
import { TriStateCheckbox } from "./tri-state-checkbox";

interface PermissionTreeProps {
  /** Already filtered by the toolbar's search. */
  tree: readonly ServerNode[];
  draft: GrantDraft;
  expandedServers: ReadonlySet<number>;
  expandedDatabases: ReadonlySet<number>;
  onToggleServerExpanded: (serverId: number) => void;
  onToggleDatabaseExpanded: (databaseId: number) => void;
  onToggleServer: (server: ServerNode, grant: boolean) => void;
  onToggleDatabase: (server: ServerNode, database: DatabaseNode, grant: boolean) => void;
  onToggleTable: (
    server: ServerNode,
    database: DatabaseNode,
    tableId: number,
    grant: boolean
  ) => void;
  /** Search is active, so branches are forced open to show what matched. */
  isSearching: boolean;
}

/**
 * Nested disclosure lists rather than the ARIA `tree` pattern.
 *
 * A real tree widget owes the user roving-tabindex arrow-key navigation and
 * per-item selection semantics; this control is a set of grouped checkboxes,
 * and every row here is reachable by Tab already. Claiming `role="tree"`
 * without the keyboard contract behind it would promise more than it delivers.
 */
export function PermissionTree({
  tree,
  draft,
  expandedServers,
  expandedDatabases,
  onToggleServerExpanded,
  onToggleDatabaseExpanded,
  onToggleServer,
  onToggleDatabase,
  onToggleTable,
  isSearching,
}: PermissionTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="rounded-[11px] border border-border">
        <EmptyState
          title="Nothing matches this search"
          description="No servers, databases, or tables match the current query."
          className="py-10"
        />
      </div>
    );
  }

  return (
    <ul
      aria-label="Resource hierarchy access tree"
      className="max-h-120 overflow-y-auto rounded-[11px] border border-border"
    >
      {tree.map((server) => {
        const state = serverState(server, draft);
        // While filtering, collapsing a branch would hide the very rows the
        // query surfaced, so expansion is forced open for the duration.
        const isExpanded = isSearching || expandedServers.has(server.server_id);

        return (
          <li key={server.server_id}>
            <div className="flex items-center gap-2.5 border-t border-border bg-field px-3.5 py-3">
              <DisclosureButton
                expanded={isExpanded}
                label={server.server_name}
                onClick={() => onToggleServerExpanded(server.server_id)}
                disabled={isSearching}
              />
              <TriStateCheckbox
                size="lg"
                state={state}
                label={`Grant access to server ${server.server_name}`}
                onChange={() => onToggleServer(server, state !== "checked")}
              />
              <Server
                aria-hidden="true"
                className="h-3.75 w-3.75 shrink-0 text-muted-foreground"
                strokeWidth={1.7}
              />
              <span className="flex-1 truncate text-[13.5px] font-bold">
                {server.server_name}
              </span>
              <span className="shrink-0 text-[11.5px] font-semibold text-subtle-foreground">
                {pluralize(server.databases.length, "catalog")}
              </span>
            </div>

            {isExpanded && (
              <ul>
                {server.databases.map((database) => {
                  const dbState = databaseState(database, draft);
                  const isDatabaseExpanded =
                    isSearching || expandedDatabases.has(database.database_id);

                  return (
                    <li key={database.database_id}>
                      <div className="flex items-center gap-2.5 border-t border-row-border py-2.5 pr-3.5 pl-10 hover:bg-row-hover">
                        <DisclosureButton
                          expanded={isDatabaseExpanded}
                          label={database.database_name}
                          onClick={() => onToggleDatabaseExpanded(database.database_id)}
                          disabled={isSearching}
                        />
                        <TriStateCheckbox
                          state={dbState}
                          label={`Grant access to database ${database.database_name}`}
                          onChange={() =>
                            onToggleDatabase(server, database, dbState !== "checked")
                          }
                        />
                        <Database
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.7}
                        />
                        <span className="flex-1 truncate text-[13px] font-semibold">
                          {database.database_name}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-subtle-foreground">
                          {pluralize(database.tables.length, "table")}
                        </span>
                      </div>

                      {isDatabaseExpanded && (
                        <ul>
                          {database.tables.map((table) => {
                            const checked =
                              tableState(table.table_id, draft) === "checked";
                            const name = qualifiedTableName(
                              table.schema_name,
                              table.table_name
                            );

                            return (
                              <li
                                key={table.table_id}
                                className="flex items-center gap-2.5 border-t border-row-border py-2 pr-3.5 pl-17 hover:bg-row-hover"
                              >
                                <TriStateCheckbox
                                  size="sm"
                                  state={checked ? "checked" : "unchecked"}
                                  label={`Grant access to table ${name}`}
                                  onChange={() =>
                                    onToggleTable(
                                      server,
                                      database,
                                      table.table_id,
                                      !checked
                                    )
                                  }
                                />
                                <span
                                  className={cn(
                                    "truncate font-mono text-[12.5px]",
                                    checked
                                      ? "text-foreground"
                                      : "text-subtle-foreground"
                                  )}
                                >
                                  {name}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface DisclosureButtonProps {
  expanded: boolean;
  /** Name of the branch being opened, used to build the accessible label. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function DisclosureButton({ expanded, label, onClick, disabled }: DisclosureButtonProps) {
  const Icon = expanded ? ChevronDown : ChevronRight;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      disabled={disabled}
      onClick={onClick}
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-subtle-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}
