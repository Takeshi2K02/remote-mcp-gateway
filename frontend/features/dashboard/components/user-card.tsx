"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Shield, Mail, Key } from "lucide-react";

export function UserCard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>No active user session</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get initials for user avatar
  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="shadow-sm border-border h-full flex flex-col justify-between">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
            {getInitials(user.full_name)}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">{user.full_name || "Admin User"}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-0.5 text-xs font-medium text-muted-foreground">
              <Shield className="h-3 w-3 text-primary/75" />
              Administrator Session
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-end pb-5">
        <div className="grid gap-3.5 pt-2">
          {/* Email row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <Mail className="h-4 w-4 text-muted-foreground/75 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Email Address</span>
              <span className="block text-foreground font-medium truncate">{user.email}</span>
            </div>
          </div>

          {/* Entra ID row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <Key className="h-4 w-4 text-muted-foreground/75 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Entra Object ID</span>
              <span className="block text-foreground font-mono text-xs truncate select-all">{user.entra_object_id || "N/A"}</span>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between text-sm bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground/75 shrink-0" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Account Status</span>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
