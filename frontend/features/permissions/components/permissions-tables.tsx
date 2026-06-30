"use client";

import * as React from "react";
import {
  getSQLServerPermissions,
  getDatabasePermissions,
  getTablePermissions,
  createSQLServerPermission,
  createDatabasePermission,
  createTablePermission,
  deleteSQLServerPermission,
  deleteDatabasePermission,
  deleteTablePermission,
  type SQLServerPermission,
  type DatabasePermission,
  type TablePermission,
} from "../services/permissions.service";
import { getSQLServers, type SQLServer } from "@/features/sql-servers/services/sql-servers.service";
import { getDatabases, type DatabaseModel } from "@/features/databases/services/databases.service";
import { getDatabaseTables, type DatabaseTable } from "@/features/tables/services/tables.service";
import { PermissionForm } from "./permission-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Key, Database, Server, Plus, Trash2, CheckCircle2 } from "lucide-react";

export function PermissionsTables() {
  const [serverPerms, setServerPerms] = React.useState<SQLServerPermission[]>([]);
  const [dbPerms, setDbPerms] = React.useState<DatabasePermission[]>([]);
  const [tablePerms, setTablePerms] = React.useState<TablePermission[]>([]);

  // Raw resources for select options
  const [servers, setServers] = React.useState<SQLServer[]>([]);
  const [databases, setDatabases] = React.useState<DatabaseModel[]>([]);
  const [tables, setTables] = React.useState<DatabaseTable[]>([]);

  // Resolution maps
  const [serversMap, setServersMap] = React.useState<Record<number, string>>({});
  const [databasesMap, setDatabasesMap] = React.useState<Record<number, string>>({});
  const [tablesMap, setTablesMap] = React.useState<Record<number, string>>({});

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formType, setFormType] = React.useState<"server" | "database" | "table">("server");

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingPerm, setDeletingPerm] = React.useState<{
    id: number;
    user_id: number;
    target_name: string;
    type: "server" | "database" | "table";
  } | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        srvPermData,
        dbPermData,
        tblPermData,
        serversList,
        databasesList,
        tablesList,
      ] = await Promise.all([
        getSQLServerPermissions(),
        getDatabasePermissions(),
        getTablePermissions(),
        getSQLServers(),
        getDatabases(),
        getDatabaseTables(),
      ]);

      setServerPerms(srvPermData || []);
      setDbPerms(dbPermData || []);
      setTablePerms(tblPermData || []);

      setServers(serversList || []);
      setDatabases(databasesList || []);
      setTables(tablesList || []);

      // Build resolution maps
      const srvMap: Record<number, string> = {};
      serversList?.forEach((s) => (srvMap[s.id] = s.name));
      setServersMap(srvMap);

      const dbMap: Record<number, string> = {};
      databasesList?.forEach((d) => (dbMap[d.id] = d.name));
      setDatabasesMap(dbMap);

      const tblMap: Record<number, string> = {};
      tablesList?.forEach((t) => (tblMap[t.id] = `${t.schema_name}.${t.table_name}`));
      setTablesMap(tblMap);
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      setError("Could not retrieve user gateway permissions lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenCreate = (type: "server" | "database" | "table") => {
    setFormType(type);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (
    id: number,
    user_id: number,
    target_name: string,
    type: "server" | "database" | "table"
  ) => {
    setDeletingPerm({ id, user_id, target_name, type });
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (formData: { user_id: number; target_id: number }) => {
    try {
      setSubmitting(true);
      if (formType === "server") {
        await createSQLServerPermission({
          user_id: formData.user_id,
          sql_server_id: formData.target_id,
        });
        const name = serversMap[formData.target_id] || `Server #${formData.target_id}`;
        showNotification("success", `Granted server permission to User #${formData.user_id} on "${name}".`);
      } else if (formType === "database") {
        await createDatabasePermission({
          user_id: formData.user_id,
          database_id: formData.target_id,
        });
        const name = databasesMap[formData.target_id] || `Database #${formData.target_id}`;
        showNotification("success", `Granted database permission to User #${formData.user_id} on "${name}".`);
      } else {
        await createTablePermission({
          user_id: formData.user_id,
          table_id: formData.target_id,
        });
        const name = tablesMap[formData.target_id] || `Table #${formData.target_id}`;
        showNotification("success", `Granted table permission to User #${formData.user_id} on "${name}".`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      console.error("Error creating permission:", err);
      showNotification("error", "Failed to grant permission configuration. Check if it already exists.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPerm) return;
    try {
      setSubmitting(true);
      if (deletingPerm.type === "server") {
        await deleteSQLServerPermission(deletingPerm.id);
      } else if (deletingPerm.type === "database") {
        await deleteDatabasePermission(deletingPerm.id);
      } else {
        await deleteTablePermission(deletingPerm.id);
      }
      showNotification("success", `Revoked access from User #${deletingPerm.user_id} on "${deletingPerm.target_name}".`);
      setIsDeleteOpen(false);
      loadData();
    } catch (err) {
      console.error("Error revoking permission:", err);
      showNotification("error", "Failed to revoke access mapping. Please try again.");
    } finally {
      setSubmitting(false);
      setDeletingPerm(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading credentials and access control lists...</span>
      </div>
    );
  }

  const getFormTitle = () => {
    if (formType === "server") return "Grant SQL Server Permission";
    if (formType === "database") return "Grant Database Catalog Permission";
    return "Grant Table Schema Permission";
  };

  const getFormDescription = () => {
    if (formType === "server") return "Assign user access credentials to a registered SQL Server node.";
    if (formType === "database") return "Assign user access credentials to a database catalog.";
    return "Assign user access credentials to specific schema table endpoints.";
  };

  return (
    <div className="space-y-6">
      {/* Top message banner */}
      {notification && (
        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border animate-in slide-in-from-top-2 duration-200 w-fit ${
          notification.type === "success" 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SQL Server Permissions */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-semibold">SQL Server Permissions</CardTitle>
              <CardDescription className="text-xs">User access credentials mapped to specific database servers</CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => handleOpenCreate("server")} 
            disabled={servers.length === 0} 
            size="sm" 
            className="flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Grant Access</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {serverPerms.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border-t border-border/60">
              No SQL Server permissions configured.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">SQL Server Node</th>
                  <th className="px-6 py-3">Granted</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {serverPerms.map((perm) => {
                  const targetName = serversMap[perm.sql_server_id] || `Server #${perm.sql_server_id}`;
                  return (
                    <tr key={perm.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">User #{perm.user_id}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{targetName}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(perm.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenDelete(perm.id, perm.user_id, targetName, "server")}
                          aria-label={`Revoke User ${perm.user_id} from ${targetName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 2. Database Permissions */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-semibold">Database Permissions</CardTitle>
              <CardDescription className="text-xs">User access credentials mapped to catalog databases</CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => handleOpenCreate("database")} 
            disabled={databases.length === 0} 
            size="sm" 
            className="flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Grant Access</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {dbPerms.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border-t border-border/60">
              No Database permissions configured.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Database Instance</th>
                  <th className="px-6 py-3">Granted</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dbPerms.map((perm) => {
                  const targetName = databasesMap[perm.database_id] || `Database #${perm.database_id}`;
                  return (
                    <tr key={perm.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">User #{perm.user_id}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{targetName}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(perm.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenDelete(perm.id, perm.user_id, targetName, "database")}
                          aria-label={`Revoke User ${perm.user_id} from ${targetName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 3. Table Permissions */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-semibold">Table Permissions</CardTitle>
              <CardDescription className="text-xs">User access credentials mapped to specific schemas and tables</CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => handleOpenCreate("table")} 
            disabled={tables.length === 0} 
            size="sm" 
            className="flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Grant Access</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tablePerms.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border-t border-border/60">
              No Table permissions configured.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Table Path</th>
                  <th className="px-6 py-3">Granted</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tablePerms.map((perm) => {
                  const targetName = tablesMap[perm.table_id] || `Table #${perm.table_id}`;
                  return (
                    <tr key={perm.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">User #{perm.user_id}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{targetName}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(perm.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenDelete(perm.id, perm.user_id, targetName, "table")}
                          aria-label={`Revoke User ${perm.user_id} from ${targetName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getFormTitle()}</DialogTitle>
            <DialogDescription>{getFormDescription()}</DialogDescription>
          </DialogHeader>
          
          <PermissionForm
            key={formType}
            type={formType}
            servers={servers}
            databases={databases}
            tables={tables}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            isLoading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* REVOKE (DELETE) CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Confirm Revocation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access permission from{" "}
              <strong className="text-foreground">User #{deletingPerm?.user_id}</strong> on{" "}
              <strong className="text-foreground">"{deletingPerm?.target_name}"</strong>?
              This operation is permanent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? "Revoking..." : "Revoke Access"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default PermissionsTables;
