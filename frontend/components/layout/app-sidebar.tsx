"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { NavItem } from "./nav-item";
import {
  LayoutDashboard,
  Server,
  Database,
  Table,
  Users,
  Shield,
  FileClock,
  LogOut,
  Terminal,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  className?: string;
  onClose?: () => void;
}

export function AppSidebar({ className, onClose }: AppSidebarProps) {
  const { user, logout } = useAuth();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sql-servers", label: "SQL Servers", icon: Server },
    { href: "/databases", label: "Databases", icon: Database },
    { href: "/database-tables", label: "Tables", icon: Table },
    { href: "/users", label: "Users", icon: Users },
    { href: "/permissions", label: "Permissions", icon: Shield },
    { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  ];

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
    <div className={`flex flex-col h-full bg-card border-r border-border ${className || ""}`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
              MCP Gateway
            </span>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Admin Console
            </span>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        <div className="space-y-1">
          <span className="px-3 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider block mb-2">
            Navigation
          </span>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                onClick={onClose}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* User Area */}
      {user && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
              {getInitials(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.full_name || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full text-xs flex items-center justify-center gap-2 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      )}
    </div>
  );
}
