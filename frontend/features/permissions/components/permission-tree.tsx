"use client";

import * as React from "react";
import { ServerNode, DatabaseNode, TableNode, CheckedState } from "../types/permission-tree.types";
import { TriStateCheckbox } from "./tri-state-checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Database, 
  Table2, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  FolderOpen, 
  FolderClosed,
  CheckSquare,
  Square,
  Activity,
  Layers
} from "lucide-react";

interface PermissionTreeProps {
  treeData: ServerNode[];
  onTreeChange: (newTree: ServerNode[]) => void;
}

// Utility to get checked state of database
export function getDatabaseState(db: DatabaseNode): CheckedState {
  if (db.tables.length === 0) {
    return db.checked ? "checked" : "unchecked";
  }
  const allChecked = db.tables.every((t) => t.checked);
  const noneChecked = db.tables.every((t) => !t.checked);
  if (allChecked) return "checked";
  if (noneChecked) return "unchecked";
  return "indeterminate";
}

// Utility to get checked state of server
export function getServerState(server: ServerNode): CheckedState {
  if (server.databases.length === 0) {
    return server.checked ? "checked" : "unchecked";
  }
  const dbStates = server.databases.map(getDatabaseState);
  const allChecked = dbStates.every((s) => s === "checked");
  const noneChecked = dbStates.every((s) => s === "unchecked");
  if (allChecked) return "checked";
  if (noneChecked) return "unchecked";
  return "indeterminate";
}

export function PermissionTree({ treeData, onTreeChange }: PermissionTreeProps) {
  const [search, setSearch] = React.useState("");
  
  // Expanded sets (tracked by IDs)
  const [expandedServers, setExpandedServers] = React.useState<Set<number>>(new Set());
  const [expandedDbs, setExpandedDbs] = React.useState<Set<number>>(new Set());

  // Initialize with first server expanded if exists
  React.useEffect(() => {
    if (treeData.length > 0 && expandedServers.size === 0) {
      setExpandedServers(new Set([treeData[0].server_id]));
    }
  }, [treeData]);

  // Toggle server expansion
  const toggleServerExpand = (serverId: number) => {
    const next = new Set(expandedServers);
    if (next.has(serverId)) {
      next.delete(serverId);
    } else {
      next.add(serverId);
    }
    setExpandedServers(next);
  };

  // Toggle database expansion
  const toggleDbExpand = (dbId: number) => {
    const next = new Set(expandedDbs);
    if (next.has(dbId)) {
      next.delete(dbId);
    } else {
      next.add(dbId);
    }
    setExpandedDbs(next);
  };

  const handleExpandAll = () => {
    const servers = new Set(treeData.map((s) => s.server_id));
    const dbs = new Set(treeData.flatMap((s) => s.databases.map((d) => d.database_id)));
    setExpandedServers(servers);
    setExpandedDbs(dbs);
  };

  const handleCollapseAll = () => {
    setExpandedServers(new Set());
    setExpandedDbs(new Set());
  };

  // Select all nodes
  const handleSelectAll = () => {
    const updated = treeData.map((s) => ({
      ...s,
      checked: true,
      databases: s.databases.map((d) => ({
        ...d,
        checked: true,
        tables: d.tables.map((t) => ({ ...t, checked: true })),
      })),
    }));
    onTreeChange(updated);
  };

  // Clear all nodes
  const handleClearAll = () => {
    const updated = treeData.map((s) => ({
      ...s,
      checked: false,
      databases: s.databases.map((d) => ({
        ...d,
        checked: false,
        tables: d.tables.map((t) => ({ ...t, checked: false })),
      })),
    }));
    onTreeChange(updated);
  };

  // Toggling Checkbox Handlers
  const handleServerCheckToggle = (serverId: number) => {
    const updated = treeData.map((s) => {
      if (s.server_id !== serverId) return s;
      const targetState = getServerState(s);
      const nextChecked = targetState !== "checked"; // If checked or indeterminate, we uncheck it.
      
      return {
        ...s,
        checked: nextChecked,
        databases: s.databases.map((d) => ({
          ...d,
          checked: nextChecked,
          tables: d.tables.map((t) => ({ ...t, checked: nextChecked })),
        })),
      };
    });
    onTreeChange(updated);
  };

  const handleDatabaseCheckToggle = (serverId: number, dbId: number) => {
    const updated = treeData.map((s) => {
      if (s.server_id !== serverId) return s;
      
      const nextDbs = s.databases.map((d) => {
        if (d.database_id !== dbId) return d;
        const targetState = getDatabaseState(d);
        const nextChecked = targetState !== "checked";

        return {
          ...d,
          checked: nextChecked,
          tables: d.tables.map((t) => ({ ...t, checked: nextChecked })),
        };
      });

      // Recalculate parent server's checked flag
      const serverChecked = nextDbs.some((d) => d.checked || getDatabaseState(d) !== "unchecked");

      return {
        ...s,
        checked: serverChecked,
        databases: nextDbs,
      };
    });
    onTreeChange(updated);
  };

  const handleTableCheckToggle = (serverId: number, dbId: number, tableId: number) => {
    const updated = treeData.map((s) => {
      if (s.server_id !== serverId) return s;

      const nextDbs = s.databases.map((d) => {
        if (d.database_id !== dbId) return d;

        const nextTables = d.tables.map((t) => {
          if (t.table_id !== tableId) return t;
          return { ...t, checked: !t.checked };
        });

        const dbChecked = nextTables.some((t) => t.checked);

        return {
          ...d,
          checked: dbChecked,
          tables: nextTables,
        };
      });

      const serverChecked = nextDbs.some((d) => d.checked);

      return {
        ...s,
        checked: serverChecked,
        databases: nextDbs,
      };
    });
    onTreeChange(updated);
  };

  // Summaries Calculations
  const stats = React.useMemo(() => {
    let totalServers = treeData.length;
    let checkedServers = treeData.filter((s) => s.checked).length;

    let totalDbs = 0;
    let checkedDbs = 0;

    let totalTables = 0;
    let checkedTables = 0;

    treeData.forEach((s) => {
      s.databases.forEach((d) => {
        totalDbs++;
        if (d.checked) checkedDbs++;

        d.tables.forEach((t) => {
          totalTables++;
          if (t.checked) checkedTables++;
        });
      });
    });

    return {
      totalServers,
      checkedServers,
      totalDbs,
      checkedDbs,
      totalTables,
      checkedTables,
    };
  }, [treeData]);

  // Filtering tree structure by search query
  const filteredTree = React.useMemo(() => {
    if (!search.trim()) return treeData;
    const q = search.toLowerCase();

    return treeData
      .map((s) => {
        // Filter databases inside server
        const matchingDbs = s.databases
          .map((d) => {
            const matchingTables = d.tables.filter(
              (t) =>
                t.table_name.toLowerCase().includes(q) ||
                t.schema_name.toLowerCase().includes(q)
            );
            const dbMatches = d.database_name.toLowerCase().includes(q);
            
            // If DB matches or has matching tables, keep it
            if (dbMatches || matchingTables.length > 0) {
              return {
                ...d,
                tables: matchingTables.length > 0 ? matchingTables : d.tables,
              };
            }
            return null;
          })
          .filter((d): d is DatabaseNode => d !== null);

        const serverMatches = s.server_name.toLowerCase().includes(q);

        if (serverMatches || matchingDbs.length > 0) {
          return {
            ...s,
            databases: matchingDbs.length > 0 ? matchingDbs : s.databases,
          };
        }
        return null;
      })
      .filter((s): s is ServerNode => s !== null);
  }, [treeData, search]);

  return (
    <div className="space-y-4">
      {/* Search and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search servers, catalogs, tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExpandAll} className="text-[11px] h-8 px-2.5">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={handleCollapseAll} className="text-[11px] h-8 px-2.5">
            Collapse All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-[11px] h-8 px-2.5 hover:text-emerald-500">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll} className="text-[11px] h-8 px-2.5 hover:text-destructive">
            Clear All
          </Button>
        </div>
      </div>

      {/* Resource Count Summary Badge */}
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground p-3 border rounded-lg bg-card shadow-sm border-border/80">
        <div className="flex items-center gap-1.5">
          <Server className="h-4 w-4 text-muted-foreground/80" />
          <span>Servers: <strong className="text-foreground">{stats.checkedServers}/{stats.totalServers}</strong></span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Database className="h-4 w-4 text-muted-foreground/80" />
          <span>Databases: <strong className="text-foreground">{stats.checkedDbs}/{stats.totalDbs}</strong></span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Table2 className="h-4 w-4 text-muted-foreground/80" />
          <span>Tables: <strong className="text-foreground">{stats.checkedTables}/{stats.totalTables}</strong></span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="border border-border rounded-lg bg-card divide-y divide-border/60 overflow-hidden shadow-sm">
        {filteredTree.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No database resources match the query filters.
          </div>
        ) : (
          filteredTree.map((server) => {
            const isServerExpanded = expandedServers.has(server.server_id);
            const serverState = getServerState(server);

            return (
              <div key={server.server_id} className="flex flex-col">
                {/* Server Row */}
                <div 
                  onClick={() => toggleServerExpand(server.server_id)}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/30 cursor-pointer select-none transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground p-0 hover:bg-transparent"
                    >
                      {isServerExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    
                    <TriStateCheckbox
                      state={serverState}
                      onChange={() => handleServerCheckToggle(server.server_id)}
                    />

                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary/80" />
                      <span className="font-semibold text-sm text-foreground">{server.server_name}</span>
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/80 bg-muted/10 font-mono">
                    {server.databases.length} Catalogs
                  </Badge>
                </div>

                {/* Server Databases (Children) */}
                {isServerExpanded && (
                  <div className="bg-muted/10 border-t border-border/40 pl-9 divide-y divide-border/40">
                    {server.databases.length === 0 ? (
                      <div className="p-3 text-[11px] text-muted-foreground italic">
                        No database catalogs discovered on this SQL Server.
                      </div>
                    ) : (
                      server.databases.map((db) => {
                        const isDbExpanded = expandedDbs.has(db.database_id);
                        const dbState = getDatabaseState(db);

                        return (
                          <div key={db.database_id} className="flex flex-col">
                            {/* Database Row */}
                            <div
                              onClick={() => toggleDbExpand(db.database_id)}
                              className="flex items-center justify-between py-2.5 pr-4 hover:bg-muted/30 cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 text-muted-foreground p-0 hover:bg-transparent"
                                >
                                  {isDbExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </Button>

                                <TriStateCheckbox
                                  state={dbState}
                                  onChange={() => handleDatabaseCheckToggle(server.server_id, db.database_id)}
                                />

                                <div className="flex items-center gap-2">
                                  <Database className="h-3.5 w-3.5 text-amber-500/80" />
                                  <span className="text-xs font-semibold text-foreground">{db.database_name}</span>
                                </div>
                              </div>

                              <Badge variant="outline" className="text-[9px] font-mono border-border/60">
                                {db.tables.length} Tables
                              </Badge>
                            </div>

                            {/* Database Tables (Grandchildren) */}
                            {isDbExpanded && (
                              <div className="bg-card pl-10 pr-4 py-2 border-t border-border/20 divide-y divide-border/20 max-h-72 overflow-y-auto scrollbar-thin">
                                {db.tables.length === 0 ? (
                                  <div className="py-2 text-[10px] text-muted-foreground italic">
                                    No tables registered. Execute sync to fetch schema metadata.
                                  </div>
                                ) : (
                                  db.tables.map((tbl) => (
                                    <div
                                      key={tbl.table_id}
                                      onClick={() => handleTableCheckToggle(server.server_id, db.database_id, tbl.table_id)}
                                      className="flex items-center gap-3 py-2 cursor-pointer select-none hover:text-foreground text-muted-foreground transition-colors group"
                                    >
                                      <TriStateCheckbox
                                        state={tbl.checked ? "checked" : "unchecked"}
                                        onChange={() => handleTableCheckToggle(server.server_id, db.database_id, tbl.table_id)}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Table2 className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                        <span className="text-xs font-mono">
                                          <span className="opacity-60">{tbl.schema_name}</span>
                                          <span>.</span>
                                          <span className="text-foreground font-medium">{tbl.table_name}</span>
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
