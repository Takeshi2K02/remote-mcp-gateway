"use client";

import * as React from "react";
import { User } from "@/features/users/types/user.types";
import { getUsers } from "@/features/users/services/users.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Users, User as UserIcon, Check, Loader2, AlertCircle } from "lucide-react";

interface UserSelectorProps {
  onSelectUser: (user: User) => void;
  selectedUser: User | null;
}

export function UserSelector({ onSelectUser, selectedUser }: UserSelectorProps) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(data || []);
      } catch (err) {
        console.error(err);
        setError("Could not load users for selection.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handle outside clicks to close the dropdown
  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border rounded-lg bg-card/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Loading authorization directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive p-3 border border-destructive/20 rounded-lg bg-destructive/10">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Administrator Target User</Label>
      
      {!selectedUser ? (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-9 text-xs"
          />
          
          {isOpen && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto shadow-lg border-border animate-in fade-in-50 slide-in-from-top-1 duration-150">
              <CardContent className="p-1">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching users found.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onSelectUser(user);
                        setSearch("");
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-left p-2 rounded-md hover:bg-muted/60 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {(user.full_name || user.email).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.full_name || "Unspecified"}</div>
                          <div className="text-[10px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {user.is_admin && <Badge variant="default" className="text-[9px] px-1 py-0 h-4">Admin</Badge>}
                        {!user.is_active && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Inactive</Badge>}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary">
              {(selectedUser.full_name || selectedUser.email).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">
                {selectedUser.full_name || "Unspecified"}
              </div>
              <div className="text-xs text-muted-foreground font-mono">{selectedUser.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {selectedUser.is_admin && <Badge variant="default">Admin</Badge>}
              <Badge variant={selectedUser.is_active ? "success" : "destructive"}>
                {selectedUser.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectUser(null as any)}
              className="text-xs h-8"
            >
              Change User
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
