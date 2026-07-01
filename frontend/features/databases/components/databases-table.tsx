"use client";

import * as React from "react";
import { 
  getDatabases, 
  updateDatabase, 
  deleteDatabase,
  syncDatabases,
  syncDatabaseTables,
  type DatabaseModel 
} from "../services/databases.service";
import { getSQLServers, type SQLServer } from "@/features/sql-servers/services/sql-servers.service";
import { DatabaseForm, type DatabaseFormData } from "./database-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Database, Edit, Trash2, CheckCircle2, RefreshCw } from "lucide-react";

export function DatabasesTable() {
  const [databases, setDatabases] = React.useState<DatabaseModel[]>([]);
  const [servers, setServers] = React.useState<SQLServer[]>([]);
  const [serversMap, setServersMap] = React.useState<Record<number, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit / Delete dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingDatabase, setEditingDatabase] = React.useState<DatabaseModel | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingDatabase, setDeletingDatabase] = React.useState<DatabaseModel | null>(null);

  // Sync server picker dialog
  const [isSyncOpen, setIsSyncOpen] = React.useState(false);
  const [selectedServerId, setSelectedServerId] = React.useState<number | "">("");

  const [submitting, setSubmitting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncingDbId, setSyncingDbId] = React.useState<number | null>(null);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dbData, serverData] = await Promise.all([
        getDatabases(),
        getSQLServers(),
      ]);

      setDatabases(dbData || []);
      setServers(serverData || []);
      
      const serverMap: Record<number, string> = {};
      serverData?.forEach((srv) => {
        serverMap[srv.id] = srv.name;
      });
      setServersMap(serverMap);
    } catch (err) {
      console.error("Failed to fetch databases data:", err);
      setError("Could not retrieve databases. Please verify connection to the gateway API.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleOpenEdit = (db: DatabaseModel) => {
    setEditingDatabase(db);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (db: DatabaseModel) => {
    setDeletingDatabase(db);
    setIsDeleteOpen(true);
  };

  const handleSyncAllDatabases = async () => {
    if (!selectedServerId) return;
    setSyncing(true);
    setIsSyncOpen(false);
    try {
      const result = await syncDatabases(selectedServerId as number);
      showNotification(
        "success",
        `Sync complete — ${result.databases_added} databases added, ${result.databases_updated} updated, ${result.tables_added} tables added, ${result.tables_updated} updated.`
      );
      loadData();
    } catch (err) {
      console.error("Sync failed:", err);
      showNotification("error", "Sync failed. Check server credentials and connectivity.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncDbTables = async (db: DatabaseModel) => {
    setSyncingDbId(db.id);
    try {
      const result = await syncDatabaseTables(db.id);
      showNotification(
        "success",
        `"${db.name}" — ${result.tables_added} tables added, ${result.tables_updated} updated.`
      );
      loadData();
    } catch (err) {
      console.error("Table sync failed:", err);
      showNotification("error", `Failed to sync tables for "${db.name}".`);
    } finally {
      setSyncingDbId(null);
    }
  };

  const handleEditSubmit = async (formData: DatabaseFormData) => {
    if (!editingDatabase) return;
    try {
      setSubmitting(true);
      await updateDatabase(editingDatabase.id, formData);
      showNotification("success", `Database "${formData.name}" successfully updated.`);
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving database:", err);
      showNotification("error", "Failed to save database configuration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDatabase) return;
    try {
      setSubmitting(true);
      await deleteDatabase(deletingDatabase.id);
      showNotification("success", `Database "${deletingDatabase.name}" successfully deleted.`);
      setIsDeleteOpen(false);
      loadData();
    } catch (err) {
      console.error("Error deleting database:", err);
      showNotification("error", "Failed to delete database. Ensure no schema tables depend on it.");
    } finally {
      setSubmitting(false);
      setDeletingDatabase(null);
    }
  };

  // Compute stats
  const lastSynced = databases
    .map((d) => d.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Fetching databases...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Row */}
      <div className="flex items-center justify-between gap-4">
        {notification ? (
          <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success" 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}>
            {notification.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{notification.text}</span>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">{databases.length} database{databases.length !== 1 ? "s" : ""}</span>
            {lastSynced && (
              <span>Last synced: {new Date(lastSynced).toLocaleString()}</span>
            )}
          </div>
        )}
        <Button 
          onClick={() => {
            setSelectedServerId(servers[0]?.id ?? "");
            setIsSyncOpen(true);
          }}
          disabled={servers.length === 0 || syncing}
          className="flex items-center gap-2 shadow-sm shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Syncing…" : "Sync Databases"}</span>
        </Button>
      </div>

      {servers.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>You must register at least one SQL Server instance before syncing databases.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table view */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Discovered Databases</CardTitle>
              <CardDescription className="text-xs">SQL Server databases automatically discovered on this gateway</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {databases.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No databases discovered yet. Use "Sync Databases" to discover databases from your SQL Servers.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">Database Name</th>
                  <th className="px-6 py-3">SQL Server</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Last Synced</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {databases.map((db) => {
                  const isSyncingRow = syncingDbId === db.id;
                  return (
                    <tr key={db.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{db.name}</span>
                          {db.description && (
                            <span className="text-[11px] font-normal text-muted-foreground mt-0.5">{db.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                          {serversMap[db.sql_server_id] || `Server #${db.sql_server_id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          db.is_active 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {db.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {db.last_synced_at
                          ? new Date(db.last_synced_at).toLocaleString()
                          : <span className="text-muted-foreground/50 italic">Never</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleSyncDbTables(db)}
                            disabled={isSyncingRow}
                            aria-label={`Sync tables for ${db.name}`}
                            title="Sync Tables"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncingRow ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(db)}
                            aria-label={`Edit ${db.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleOpenDelete(db)}
                            aria-label={`Delete ${db.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* SYNC SERVER PICKER DIALOG */}
      <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Databases
            </DialogTitle>
            <DialogDescription>
              Select a SQL Server to discover and synchronize all its user databases and tables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sync-server-select" className="text-sm font-medium">SQL Server</label>
              <select
                id="sync-server-select"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(Number(e.target.value))}
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setIsSyncOpen(false)}>Cancel</Button>
            <Button onClick={handleSyncAllDatabases} disabled={!selectedServerId}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Database</DialogTitle>
            <DialogDescription>Modify description and active status metadata.</DialogDescription>
          </DialogHeader>
          
          <DatabaseForm
            key={editingDatabase ? `edit-${editingDatabase.id}` : "edit"}
            servers={servers}
            defaultValues={editingDatabase || undefined}
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditOpen(false)}
            isLoading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete database mapping{" "}
              <strong className="text-foreground">"{deletingDatabase?.name}"</strong>?
              This operation cannot be undone. Active permissions associated with this database will be purged.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Database"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default DatabasesTable;
