"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileClock, User, ShieldCheck, Database, Server, RefreshCw } from "lucide-react";

interface AuditLogPlaceholder {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: "auth" | "database" | "server" | "permission";
}

export function RecentAuditCard() {
  const auditLogs: AuditLogPlaceholder[] = [
    {
      id: "1",
      user: "Admin User",
      action: "Modified SQL Server connection",
      target: "sql-server-prod-east",
      timestamp: "10 minutes ago",
      type: "server",
    },
    {
      id: "2",
      user: "Admin User",
      action: "Configured table mapping",
      target: "dbo.orders",
      timestamp: "1 hour ago",
      type: "database",
    },
    {
      id: "3",
      user: "System Gatekeeper",
      action: "Synchronized MCP Server tools list",
      target: "mcp-gateway-service",
      timestamp: "3 hours ago",
      type: "auth",
    },
    {
      id: "4",
      user: "Admin User",
      action: "Modified DB user permissions",
      target: "db_client_registry",
      timestamp: "1 day ago",
      type: "permission",
    },
    {
      id: "5",
      user: "Admin User",
      action: "Created new Database connection",
      target: "db_warehouse_sales",
      timestamp: "2 days ago",
      type: "database",
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "auth":
        return ShieldCheck;
      case "database":
        return Database;
      case "server":
        return Server;
      default:
        return FileClock;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case "server":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "database":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "auth":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "permission":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileClock className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Recent Activity</CardTitle>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">Audit log summary</span>
              <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                Placeholder
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border/60">
          {auditLogs.map((log) => {
            const Icon = getIcon(log.type);
            return (
              <div key={log.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-muted/10 transition-colors">
                <div className={`p-2 rounded-lg border ${getColorClasses(log.type)} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {log.action}
                    </p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{log.user}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <code className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20 truncate max-w-[150px] sm:max-w-xs">
                      {log.target}
                    </code>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
export default RecentAuditCard;
