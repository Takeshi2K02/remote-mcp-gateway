"use client";

import * as React from "react";
import { 
  getSQLServers, 
  createSQLServer, 
  updateSQLServer, 
  deleteSQLServer, 
  type SQLServer 
} from "../services/sql-servers.service";
import { SQLServerForm, type SQLServerFormData } from "./sql-server-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Server, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";

export function SQLServersTable() {
  const [servers, setServers] = React.useState<SQLServer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingServer, setEditingServer] = React.useState<SQLServer | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingServer, setDeletingServer] = React.useState<SQLServer | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSQLServers();
      setServers(data || []);
    } catch (err) {
      console.error("Failed to fetch SQL servers:", err);
      setError("Could not retrieve SQL servers list. Please verify connection to the gateway.");
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
    setEditingServer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (server: SQLServer) => {
    setEditingServer(server);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (server: SQLServer) => {
    setDeletingServer(server);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (formData: SQLServerFormData) => {
    try {
      setSubmitting(true);
      if (editingServer) {
        // Edit Mode
        await updateSQLServer(editingServer.id, formData);
        showNotification("success", `Server "${formData.name}" successfully updated.`);
      } else {
        // Create Mode
        await createSQLServer(formData);
        showNotification("success", `Server "${formData.name}" successfully registered.`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving server:", err);
      showNotification("error", "Failed to save the server configuration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingServer) return;
    try {
      setSubmitting(true);
      await deleteSQLServer(deletingServer.id);
      showNotification("success", `Server "${deletingServer.name}" successfully deleted.`);
      setIsDeleteOpen(false);
      loadData();
    } catch (err) {
      console.error("Error deleting server:", err);
      showNotification("error", "Failed to delete the server. Ensure no database depends on it.");
    } finally {
      setSubmitting(false);
      setDeletingServer(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Fetching server configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top action row */}
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
        <Button onClick={handleOpenCreate} className="flex items-center gap-2 shadow-sm shrink-0">
          <Plus className="h-4 w-4" />
          <span>New Server</span>
        </Button>
      </div>

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
            <Server className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Active Registries</CardTitle>
              <CardDescription className="text-xs">Database server instances currently registered on this gateway</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {servers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No SQL Servers found. Register a new server endpoint to begin.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">Server Name</th>
                  <th className="px-6 py-3">Host Endpoint</th>
                  <th className="px-6 py-3">Port</th>
                  <th className="px-6 py-3">Authentication</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {servers.map((server) => (
                  <tr key={server.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex flex-col">
                        <span>{server.name}</span>
                        {server.description && (
                          <span className="text-[11px] font-normal text-muted-foreground mt-0.5">{server.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground select-all">{server.host}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{server.port}</td>
                    <td className="px-6 py-4 capitalize text-muted-foreground">
                      {server.authentication_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        server.is_active 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {server.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(server.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(server)}
                          aria-label={`Edit ${server.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleOpenDelete(server)}
                          aria-label={`Delete ${server.name}`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? "Edit Server Configuration" : "Register SQL Server"}
            </DialogTitle>
            <DialogDescription>
              {editingServer 
                ? "Modify connection options and credential aliases for this instance." 
                : "Add details to register a new SQL Server connection with the remote gateway."}
            </DialogDescription>
          </DialogHeader>
          
          <SQLServerForm
            key={editingServer ? `edit-${editingServer.id}` : "create"}
            defaultValues={editingServer || undefined}
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
              Are you sure you want to delete server registry{" "}
              <strong className="text-foreground">"{deletingServer?.name}"</strong>?
              This operation is permanent and cannot be undone. Any active permissions for this server will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SQLServersTable;
