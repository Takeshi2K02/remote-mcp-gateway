"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api/http-client";
import { Activity, Database, Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthStatus = "checking" | "healthy" | "unhealthy";

export function HealthCard() {
  const [apiHealth, setApiHealth] = useState<HealthStatus>("checking");
  const [dbHealth, setDbHealth] = useState<HealthStatus>("checking");
  const [apiEnv, setApiEnv] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    
    // Check API Health
    try {
      const res = await apiRequest<{ status: string; environment?: string }>("/health", { authenticated: false });
      if (res && res.status === "ok") {
        setApiHealth("healthy");
        if (res.environment) setApiEnv(res.environment);
      } else {
        setApiHealth("unhealthy");
      }
    } catch {
      setApiHealth("unhealthy");
    }

    // Check Database Health
    try {
      const res = await apiRequest<{ database: string }>("/db-health", { authenticated: false });
      if (res && res.database === "connected") {
        setDbHealth("healthy");
      } else {
        setDbHealth("unhealthy");
      }
    } catch {
      setDbHealth("unhealthy");
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-sm border-border h-full flex flex-col justify-between">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">System Health</CardTitle>
          <CardDescription className="text-xs">Live connectivity status of the gateway</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={fetchHealth}
          disabled={isRefreshing}
          aria-label="Refresh health status"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-end pb-5">
        <div className="grid gap-3.5">
          {/* API Health row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${apiHealth === "healthy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : apiHealth === "unhealthy" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <Server className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-semibold text-foreground">API Gateway</span>
                {apiEnv && (
                  <span className="block text-[10px] text-muted-foreground font-mono">env: {apiEnv}</span>
                )}
              </div>
            </div>
            
            <div>
              {apiHealth === "checking" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground animate-pulse border border-muted">
                  Checking
                </span>
              )}
              {apiHealth === "healthy" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Healthy
                </span>
              )}
              {apiHealth === "unhealthy" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  Unhealthy
                </span>
              )}
            </div>
          </div>

          {/* Database Health row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${dbHealth === "healthy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : dbHealth === "unhealthy" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <Database className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-semibold text-foreground">Central Database</span>
                <span className="block text-[10px] text-muted-foreground">Azure SQL</span>
              </div>
            </div>
            
            <div>
              {dbHealth === "checking" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground animate-pulse border border-muted">
                  Checking
                </span>
              )}
              {dbHealth === "healthy" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              )}
              {dbHealth === "unhealthy" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
