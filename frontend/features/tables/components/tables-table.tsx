"use client";

import * as React from "react";
import { 
  getDatabaseTables, 
  createDatabaseTable, 
  updateDatabaseTable, 
  deleteDatabaseTable, 
  type DatabaseTable 
} from "../services/tables.service";
import { getDatabases, type DatabaseModel } from "@/features/databases/services/databases.service";
import { TableForm, type TableFormData } from "./table-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, TableProperties, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";

export function TablesTable() {
  const [tables, setTables] = React.useState<DatabaseTable[]>([]);
  const [databases, setDatabases] = React.useState<DatabaseModel[]>([]);
  const [databasesMap, setDatabasesMap] = React.useState<Record<number, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTable, setEditingTable] = React.useState<DatabaseTable | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingTable, setDeletingTable] = React.useState<DatabaseTable | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tableData, dbData] = await Promise.all([
        getDatabaseTables(),
        getDatabases(),
      ]);

      setTables(tableData || []);
      setDatabases(dbData || []);

      const dbMap: Record<number, string> = {};
      dbData?.forEach((db) => {
        dbMap[db.id] = db.name;
      });
      setDatabasesMap(dbMap);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
      setError("Could not retrieve tables schema map. Please verify gateway connection.");
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

  const handleOpenCreate = () => {
    setEditingTable(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tbl: DatabaseTable) => {
    setEditingTable(tbl);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (tbl: DatabaseTable) => {
    setDeletingTable(tbl);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (formData: TableFormData) => {
    try {
      setSubmitting(true);
      if (editingTable) {
        // Edit Mode (Can update schema_name, table_name, description, is_active)
        await updateDatabaseTable(editingTable.id, formData);
        showNotification("success", `Table "${formData.schema_name}.${formData.table_name}" successfully updated.`);
      } else {
        // Create Mode (Pass database_id, schema_name, table_name, description)
        const createData = {
          database_id: formData.database_id,
          schema_name: formData.schema_name,
          table_name: formData.table_name,
          description: formData.description,
        };
        await createDatabaseTable(createData);
        showNotification("success", `Table "${formData.schema_name}.${formData.table_name}" successfully registered.`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving table:", err);
      showNotification("error", "Failed to save the table mapping. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTable) return;
    try {
      setSubmitting(true);
      await deleteDatabaseTable(deletingTable.id);
      showNotification("success", `Table "${deletingTable.schema_name}.${deletingTable.table_name}" successfully deleted.`);
      setIsDeleteOpen(false);
      loadData();
    } catch (err) {
      console.error("Error deleting table:", err);
      showNotification("error", "Failed to delete table. Verify that no permissions depend on this table.");
    } finally {
      setSubmitting(false);
      setDeletingTable(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Fetching tables schema mapping...</span>
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
          disabled={databases.length === 0} 
          className="flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Table</span>
        </Button>
      </div>

      {databases.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>You must register at least one database catalog before mapping schemas.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table View */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Active Mapped Tables</CardTitle>
              <CardDescription className="text-xs">Database table schemas exposed to client query requests</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tables.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No Tables found. Register tables inside databases to map permissions and fields.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="px-6 py-3">Schema</th>
                  <th className="px-6 py-3">Table Name</th>
                  <th className="px-6 py-3">Database</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tables.map((tbl) => (
                  <tr key={tbl.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{tbl.schema_name}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex flex-col">
                        <span>{tbl.table_name}</span>
                        {tbl.description && (
                          <span className="text-[11px] font-normal text-muted-foreground mt-0.5">{tbl.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                        {databasesMap[tbl.database_id] || `Database #${tbl.database_id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        tbl.is_active 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {tbl.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(tbl.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(tbl)}
                          aria-label={`Edit ${tbl.schema_name}.${tbl.table_name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleOpenDelete(tbl)}
                          aria-label={`Delete ${tbl.schema_name}.${tbl.table_name}`}
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
              {editingTable ? "Edit Table Mapping" : "Register Table Schema"}
            </DialogTitle>
            <DialogDescription>
              {editingTable 
                ? "Modify description and active status metadata." 
                : "Map a new table schema on one of the connected databases."}
            </DialogDescription>
          </DialogHeader>
          
          <TableForm
            key={editingTable ? `edit-${editingTable.id}` : "create"}
            databases={databases}
            defaultValues={editingTable || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            isLoading={submitting}
            isEdit={!!editingTable}
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
              Are you sure you want to delete table mapping{" "}
              <strong className="text-foreground">"{deletingTable?.schema_name}.{deletingTable?.table_name}"</strong>?
              This operation cannot be undone. All user permissions mapped to this table will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Table"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default TablesTable;
