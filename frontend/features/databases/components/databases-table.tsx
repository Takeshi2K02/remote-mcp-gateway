"use client";

import * as React from "react";
import { 
  getDatabases, 
  createDatabase, 
  updateDatabase, 
  deleteDatabase, 
  type DatabaseModel 
} from "../services/databases.service";
import { getSQLServers, type SQLServer } from "@/features/sql-servers/services/sql-servers.service";
import { DatabaseForm, type DatabaseFormData } from "./database-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Database, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";

export function DatabasesTable() {
  const [databases, setDatabases] = React.useState<DatabaseModel[]>([]);
  const [servers, setServers] = React.useState<SQLServer[]>([]);
  const [serversMap, setServersMap] = React.useState<Record<number, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingDatabase, setEditingDatabase] = React.useState<DatabaseModel | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingDatabase, setDeletingDatabase] = React.useState<DatabaseModel | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
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

  // Flash notification helper
  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenCreate = () => {
    setEditingDatabase(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (db: DatabaseModel) => {
    setEditingDatabase(db);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (db: DatabaseModel) => {
    setDeletingDatabase(db);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (formData: DatabaseFormData) => {
    try {
      setSubmitting(true);
      if (editingDatabase) {
        // Edit Mode
        await updateDatabase(editingDatabase.id, formData);
        showNotification("success", `Database "${formData.name}" successfully updated.`);
      } else {
        // Create Mode
        await createDatabase(formData);
        showNotification("success", `Database "${formData.name}" successfully registered.`);
      }
      setIsFormOpen(false);
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
          <div />
        )}
        <Button 
          onClick={handleOpenCreate} 
          disabled={servers.length === 0} 
          className="flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Database</span>
        </Button>
      </div>

      {servers.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>You must register at least one SQL Server instance before mapping databases.</span>
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
              <CardTitle className="text-lg font-semibold tracking-tight">Active Databases</CardTitle>
              <CardDescription className="text-xs">SQL Server databases currently monitored on this gateway</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {databases.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No Databases found. Please register a database inside your SQL servers.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">Database Name</th>
                  <th className="px-6 py-3">SQL Server</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {databases.map((db) => (
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
                      {new Date(db.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDatabase ? "Edit Database Mapping" : "Register Database"}
            </DialogTitle>
            <DialogDescription>
              {editingDatabase 
                ? "Modify description and active status metadata." 
                : "Register a catalog database on one of the connected SQL Servers."}
            </DialogDescription>
          </DialogHeader>
          
          <DatabaseForm
            key={editingDatabase ? `edit-${editingDatabase.id}` : "create"}
            servers={servers}
            defaultValues={editingDatabase || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
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
