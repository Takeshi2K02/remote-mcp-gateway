"use client";

import * as React from "react";
import { User } from "../types/user.types";
import { getUsers, updateUser } from "../services/users.service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Edit2, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  KeyRound,
  Mail,
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export function UsersTable() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & Filtering
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"full_name" | "email">("full_name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Selected for modals
  const [viewingUser, setViewingUser] = React.useState<User | null>(null);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit form state
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");

  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Unable to retrieve user management records from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Actions
  const handleToggleStatus = async (user: User) => {
    try {
      setSubmitting(true);
      const nextActive = !user.is_active;
      const updated = await updateUser(user.id, { is_active: nextActive });
      
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      showNotification(
        "success",
        `User account for ${user.email} is now ${nextActive ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to update user status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      setSubmitting(true);
      const nextAdmin = !user.is_admin;
      const updated = await updateUser(user.id, { is_admin: nextAdmin });

      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      showNotification(
        "success",
        nextAdmin 
          ? `Promoted ${user.email} to Administrator.` 
          : `Removed Administrator role from ${user.email}.`
      );
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to update administrator role.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditEmail(user.email);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      // Wait, is updating Name/Email supported? In the backend repository:
      // UserRepository.update updates is_active and is_admin. Let's make sure it handles
      // active status and admin flags. If users are created through Entra ID, Name & Email
      // are synchronized automatically via Microsoft Callback. But let's allow editing it locally if needed,
      // or if not, let's just make it clear.
      // Wait! The UserUpdate schema has is_active and is_admin only. Let's double check.
      // Yes, UserUpdate schema has is_active: bool, is_admin: bool.
      // Let's modify UserUpdate or the UserRepository if we want to allow editing name/email,
      // or we can just update status and admin flag in the edit dialog.
      // To match the schema, the edit dialog will let you manage Active Status and Administrator Role!
      // Let's check how we want the Edit modal. It's much cleaner to edit Active/Admin flags in the form,
      // and display the synced Name/Email as read-only.
      const is_active = (document.getElementById("edit_active") as HTMLInputElement)?.checked ?? editingUser.is_active;
      const is_admin = (document.getElementById("edit_admin") as HTMLInputElement)?.checked ?? editingUser.is_admin;

      const updated = await updateUser(editingUser.id, { is_active, is_admin });
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditingUser(null);
      showNotification("success", `Updated settings for user ${updated.email}.`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to save user updates.");
    } finally {
      setSubmitting(false);
    }
  };

  // Sorting and Filtering logic
  const handleSort = (field: "full_name" | "email") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const filteredUsers = React.useMemo(() => {
    return users
      .filter((u) => {
        const query = search.toLowerCase();
        const emailMatch = u.email.toLowerCase().includes(query);
        const nameMatch = (u.full_name || "").toLowerCase().includes(query);
        return emailMatch || nameMatch;
      })
      .sort((a, b) => {
        const fieldA = (sortBy === "full_name" ? a.full_name || "" : a.email).toLowerCase();
        const fieldB = (sortBy === "full_name" ? b.full_name || "" : b.email).toLowerCase();
        if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, search, sortBy, sortOrder]);

  const paginatedUsers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading user identity directory...</span>
      </div>
    );
  }

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

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">User Directory</CardTitle>
            <CardDescription className="text-xs">Authorized credentials synchronized via Microsoft Entra ID IDP</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {paginatedUsers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border-t border-border/60">
              No matching user identities found in this directory.
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th 
                      onClick={() => handleSort("full_name")}
                      className="px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Full Name</span>
                        {sortBy === "full_name" && (
                          sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("email")}
                      className="px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Email Address</span>
                        {sortBy === "email" && (
                          sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3">Entra Object ID</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {user.full_name || <span className="text-muted-foreground italic text-xs">Unspecified</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{user.email}</td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        <span title={user.entra_object_id}>
                          {user.entra_object_id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.is_active ? "success" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.is_admin ? "default" : "secondary"}>
                          {user.is_admin ? "Admin" : "Standard"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-primary"
                            onClick={() => setViewingUser(user)}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-primary"
                            onClick={() => handleStartEdit(user)}
                            title="Edit Settings"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.is_active ? "hover:text-destructive text-emerald-500" : "hover:text-emerald-500 text-muted-foreground"}`}
                            onClick={() => handleToggleStatus(user)}
                            title={user.is_active ? "Deactivate" : "Activate"}
                            disabled={submitting}
                          >
                            {user.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.is_admin ? "hover:text-amber-500 text-primary" : "hover:text-primary text-muted-foreground"}`}
                            onClick={() => handleToggleAdmin(user)}
                            title={user.is_admin ? "Remove Admin" : "Promote Admin"}
                            disabled={submitting}
                          >
                            {user.is_admin ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                  </span> of <span className="font-semibold text-foreground">{filteredUsers.length}</span> users
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => c - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => c + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Identity Profile</DialogTitle>
            <DialogDescription>
              Detailed configuration parameters mapped to Microsoft Entra Directory.
            </DialogDescription>
          </DialogHeader>

          {viewingUser && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {(viewingUser.full_name || viewingUser.email).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{viewingUser.full_name || "Unspecified"}</h4>
                  <p className="text-xs text-muted-foreground">{viewingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 p-2 bg-card rounded border border-border/80">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserIcon className="h-3 w-3" />
                    <span>User ID</span>
                  </div>
                  <span className="font-mono font-semibold">{viewingUser.id}</span>
                </div>

                <div className="space-y-1 p-2 bg-card rounded border border-border/80">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    <span>Entra Object ID</span>
                  </div>
                  <span className="font-mono font-semibold block truncate" title={viewingUser.entra_object_id}>
                    {viewingUser.entra_object_id}
                  </span>
                </div>

                <div className="space-y-1 p-2 bg-card rounded border border-border/80">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Synchronized</span>
                  </div>
                  <span className="font-semibold">
                    {new Date(viewingUser.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1 p-2 bg-card rounded border border-border/80">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>Security Flags</span>
                  </div>
                  <div className="flex gap-1.5 pt-0.5">
                    <Badge variant={viewingUser.is_active ? "success" : "destructive"}>
                      {viewingUser.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={viewingUser.is_admin ? "default" : "secondary"}>
                      {viewingUser.is_admin ? "Admin" : "Standard"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button variant="outline" onClick={() => setViewingUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT SETTINGS DIALOG */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Security Policies</DialogTitle>
            <DialogDescription>
              Assign role authorization flags and account access controls.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>User Full Name</Label>
                <Input value={editingUser.full_name || ""} disabled className="bg-muted text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Synchronized from Entra ID claims (read-only)</p>
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input value={editingUser.email} disabled className="bg-muted text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Synchronized from Entra ID claims (read-only)</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit_active" className="text-sm font-semibold cursor-pointer">Active Gateway Status</Label>
                    <p className="text-[11px] text-muted-foreground">Allow user login credentials to request database tokens</p>
                  </div>
                  <input
                    type="checkbox"
                    id="edit_active"
                    defaultChecked={editingUser.is_active}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit_admin" className="text-sm font-semibold cursor-pointer">Administrator Privileges</Label>
                    <p className="text-[11px] text-muted-foreground">Grant permissions to update sql server registrations</p>
                  </div>
                  <input
                    type="checkbox"
                    id="edit_admin"
                    defaultChecked={editingUser.is_admin}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Apply Settings"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
