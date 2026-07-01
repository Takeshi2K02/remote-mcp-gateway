"use client";

import * as React from "react";
import { User } from "@/features/users/types/user.types";
import { ServerNode, PermissionChange } from "../types/permission-tree.types";
import { getPermissionTree, savePermissions } from "../services/permissions.service";
import { UserSelector } from "./user-selector";
import { PermissionTree } from "./permission-tree";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Shield, Save, RotateCcw } from "lucide-react";

export function PermissionManager() {
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  
  // Tree state
  const [initialTree, setInitialTree] = React.useState<ServerNode[]>([]);
  const [currentTree, setCurrentTree] = React.useState<ServerNode[]>([]);
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user's tree
  const loadTree = React.useCallback(async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPermissionTree(userId);
      // Create a deep copy for current and initial state
      setInitialTree(JSON.parse(JSON.stringify(data || [])));
      setCurrentTree(JSON.parse(JSON.stringify(data || [])));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch resource permission tree for the selected user.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedUser) {
      loadTree(selectedUser.id);
    } else {
      setInitialTree([]);
      setCurrentTree([]);
    }
  }, [selectedUser, loadTree]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Compare snapshot vs current state to generate changes
  const pendingChanges = React.useMemo(() => {
    const changes: PermissionChange[] = [];
    if (initialTree.length === 0 || currentTree.length === 0) return changes;

    // Create quick lookup maps for initial state
    const initialServerMap = new Map(initialTree.map((s) => [s.server_id, s]));
    
    currentTree.forEach((server) => {
      const initServer = initialServerMap.get(server.server_id);
      if (!initServer) return;

      // 1. Compare Server Node
      if (server.checked !== initServer.checked) {
        changes.push({
          level: "server",
          resource_id: server.server_id,
          grant: server.checked,
        });
      }

      // Create database lookup map
      const initialDbMap = new Map(initServer.databases.map((d) => [d.database_id, d]));

      server.databases.forEach((db) => {
        const initDb = initialDbMap.get(db.database_id);
        if (!initDb) return;

        // 2. Compare Database Node
        if (db.checked !== initDb.checked) {
          changes.push({
            level: "database",
            resource_id: db.database_id,
            grant: db.checked,
          });
        }

        // Create table lookup map
        const initialTableMap = new Map(initDb.tables.map((t) => [t.table_id, t]));

        db.tables.forEach((table) => {
          const initTable = initialTableMap.get(table.table_id);
          if (!initTable) return;

          // 3. Compare Table Node
          if (table.checked !== initTable.checked) {
            changes.push({
              level: "table",
              resource_id: table.table_id,
              grant: table.checked,
            });
          }
        });
      });
    });

    return changes;
  }, [initialTree, currentTree]);

  const isDirty = pendingChanges.length > 0;

  const handleReset = () => {
    setCurrentTree(JSON.parse(JSON.stringify(initialTree)));
    showNotification("success", "Reverted permission changes back to initial saved state.");
  };

  const handleSave = async () => {
    if (!selectedUser || pendingChanges.length === 0) return;
    try {
      setSubmitting(true);
      setError(null);
      await savePermissions(selectedUser.id, pendingChanges);
      showNotification("success", `Successfully applied ${pendingChanges.length} permission changes.`);
      
      // Reload hierarchy to set new baseline
      await loadTree(selectedUser.id);
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving the updated permissions config.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* User Selection Panel */}
      <Card className="shadow-sm border-border overflow-visible">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-semibold">User Selection</CardTitle>
              <CardDescription className="text-xs">Choose the admin user account whose gateway permissions should be audited or modified</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserSelector onSelectUser={setSelectedUser} selectedUser={selectedUser} />
        </CardContent>
      </Card>

      {/* Resource Tree Panel */}
      {selectedUser && (
        <Card className="shadow-sm border-border animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Resource Hierarchy Access Tree</CardTitle>
              <CardDescription className="text-xs">
                Grant or revoke database resources using hierarchical check states. Save changes to write to the gateway.
              </CardDescription>
            </div>

            {/* Change Counters / Unsaved Indicator */}
            {isDirty && (
              <div className="flex items-center gap-2 animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md text-[10px] font-semibold">
                <span>{pendingChanges.length} Unsaved Changes</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs">Loading target resource hierarchy node mapping...</span>
              </div>
            ) : (
              <>
                <PermissionTree 
                  treeData={currentTree} 
                  onTreeChange={setCurrentTree} 
                />

                {/* Save Strategy Actions bar */}
                {isDirty && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4 animate-in slide-in-from-bottom-2 duration-200">
                    <Button 
                      variant="outline" 
                      onClick={handleReset} 
                      disabled={submitting}
                      className="text-xs h-9 flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Discard Changes</span>
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={submitting}
                      className="text-xs h-9 flex items-center gap-1.5 shadow-sm"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Save Changes ({pendingChanges.length})</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export default PermissionManager;
