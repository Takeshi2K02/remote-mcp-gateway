"use client";

import { Database, Server, Table, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "../hooks/use-dashboard-summary";

// Tailwind needs the full class name at build time, so each tile's three
// tokens are written out rather than composed from a colour name.
const TILE_STYLES = {
  blue: {
    block: "bg-tile-blue",
    icon: "text-tile-blue-icon",
    label: "text-tile-blue-label",
  },
  violet: {
    block: "bg-tile-violet",
    icon: "text-tile-violet-icon",
    label: "text-tile-violet-label",
  },
  green: {
    block: "bg-tile-green",
    icon: "text-tile-green-icon",
    label: "text-tile-green-label",
  },
  amber: {
    block: "bg-tile-amber",
    icon: "text-tile-amber-icon",
    label: "text-tile-amber-label",
  },
} as const;

interface TileDefinition {
  label: string;
  icon: LucideIcon;
  tone: keyof typeof TILE_STYLES;
  value: (summary: DashboardSummary) => number;
}

const TILES: readonly TileDefinition[] = [
  { label: "SQL Servers", icon: Server, tone: "blue", value: (s) => s.servers },
  { label: "Databases", icon: Database, tone: "violet", value: (s) => s.databases },
  { label: "Tables", icon: Table, tone: "green", value: (s) => s.tables },
  { label: "Active Users", icon: Users, tone: "amber", value: (s) => s.activeUsers },
];

interface StatTilesProps {
  summary: DashboardSummary;
  isLoading: boolean;
  /** Counts are unknown, so the tiles show a dash instead of a false zero. */
  hasError: boolean;
}

export function StatTiles({ summary, isLoading, hasError }: StatTilesProps) {
  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TILES.map((tile) => {
        const styles = TILE_STYLES[tile.tone];
        return (
          <div key={tile.label} className={cn("rounded-xl p-5", styles.block)}>
            <div className="flex items-center gap-3">
              {/* White circular badge — the one place the design puts a solid
                  white disc on a pastel ground. */}
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tile-badge",
                  styles.icon
                )}
              >
                <tile.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className={cn("text-[12.5px] font-semibold", styles.label)}>
                  {tile.label}
                </p>
                <p className="text-2xl font-extrabold text-tile-value tabular-nums">
                  {isLoading ? "—" : hasError ? "—" : tile.value(summary)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
