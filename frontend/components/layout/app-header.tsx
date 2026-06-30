import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/http-client";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await apiRequest<{ status: string }>("/health", { authenticated: false });
        if (res && res.status === "ok") {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch {
        setStatus("offline");
      }
    }

    checkHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Parse path segments to generate clean breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  
  const getSegmentLabel = (segment: string) => {
    const labelMap: Record<string, string> = {
      dashboard: "Dashboard",
      "sql-servers": "SQL Servers",
      databases: "Databases",
      "database-tables": "Tables",
      users: "Users",
      permissions: "Permissions",
      "audit-logs": "Audit Logs",
      settings: "Settings",
    };
    return labelMap[segment] || segment.replace(/-/g, " ");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground" aria-label="Breadcrumb">
          <span className="hover:text-foreground transition-colors cursor-default">Admin</span>
          {segments.map((segment, index) => {
            const label = getSegmentLabel(segment);
            const isLast = index === segments.length - 1;

            return (
              <div key={segment} className="flex items-center gap-1.5 capitalize">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <span
                  className={
                    isLast
                      ? "text-foreground font-semibold cursor-default"
                      : "hover:text-foreground transition-colors cursor-default"
                  }
                >
                  {label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right: Connectivity / Status Indicator */}
      <div className="flex items-center gap-4">
        {status === "online" && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 select-none animate-in fade-in duration-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              Gateway Online
            </span>
          </div>
        )}
        {status === "offline" && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 select-none animate-in fade-in duration-300">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              Gateway Offline
            </span>
          </div>
        )}
        {status === "checking" && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-muted select-none">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
            <span className="flex items-center gap-1">
              Checking Gateway...
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
