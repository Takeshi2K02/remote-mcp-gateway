"use client";

import {
  Database,
  FileClock,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  Shield,
  Table,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NavItem } from "./nav-item";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sql-servers", label: "SQL Servers", icon: Server },
  { href: "/databases", label: "Databases", icon: Database },
  { href: "/database-tables", label: "Tables", icon: Table },
  { href: "/users", label: "Users", icon: Users },
  { href: "/permissions", label: "Permissions", icon: Shield },
  { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface AppSidebarProps {
  className?: string;
  /** Present only in the mobile drawer, which needs a way to dismiss itself. */
  onClose?: () => void;
}

export function AppSidebar({ className, onClose }: AppSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar px-3.5 py-5 text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-5.5">
        {/* The wordmark's terminal prompt. Set as text in the mono face rather
            than an icon so it matches the identifiers used throughout. */}
        <span
          aria-hidden="true"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[9px] bg-sidebar-primary/20 font-mono text-[15px] font-bold text-sidebar-primary"
        >
          &gt;_
        </span>
        <div>
          <p className="text-[15px] font-bold tracking-[-0.2px] text-sidebar-primary">
            MCP Gateway
          </p>
          <p className="mt-px text-[10px] font-semibold tracking-[0.08em] text-sidebar-muted">
            ADMIN CONSOLE
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1 text-sidebar-foreground hover:text-sidebar-accent-foreground md:hidden"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="px-2.5 py-2 text-[10px] font-bold tracking-widest text-sidebar-section">
        NAVIGATION
      </p>

      <nav aria-label="Console sections" className="flex flex-col gap-0.5">
        {NAV_LINKS.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Pushes the account block to the foot of the rail. */}
      <div className="flex-1" />

      <div className="flex flex-col gap-2.5 border-t border-sidebar-border pt-3.5">
        {user && (
          <div className="flex items-center gap-2.5 px-2">
            <span
              aria-hidden="true"
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary"
            >
              {initialsOf(user.full_name || user.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-sidebar-user">
                {user.full_name || "Admin User"}
              </p>
              <p className="truncate text-[11px] text-sidebar-user-muted">{user.email}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-[9px] bg-white/5 px-3 py-2.25 text-[13px] font-semibold text-sidebar-action transition-colors hover:bg-white/10 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <LogOut aria-hidden="true" className="h-3.75 w-3.75" strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
