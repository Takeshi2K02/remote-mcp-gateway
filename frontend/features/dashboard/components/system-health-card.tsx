"use client";

import { RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";
import { useSystemHealth } from "../hooks/use-system-health";

export function SystemHealthCard() {
  const { checks, isRefreshing, refresh } = useSystemHealth();

  return (
    <SurfaceCard className="flex h-full flex-col p-5.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">System Health</h2>
          <p className="mb-1.5 text-[12px] text-subtle-foreground">
            Live connectivity status of the gateway
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          aria-label="Refresh health status"
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <ul className="mt-2 flex flex-col">
        {checks.map((check) => (
          <li
            key={check.tag}
            className="flex items-center justify-between gap-3 border-t border-row-border px-0.5 py-2.75"
          >
            <span className="flex min-w-0 items-center gap-2.75">
              <span
                aria-hidden="true"
                className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[9.5px] font-bold text-muted-foreground"
              >
                {check.tag}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">
                  {check.name}
                </span>
                <span className="block truncate font-mono text-[11px] text-subtle-foreground">
                  {check.detail}
                </span>
              </span>
            </span>
            <StatusBadge status={check.status} size="sm" />
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
