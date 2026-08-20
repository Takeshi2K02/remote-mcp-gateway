"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { DashboardSummary } from "../hooks/use-dashboard-summary";

interface AccessGrantsCardProps {
  summary: DashboardSummary;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Two-slice donut: how much of the directory holds access.
 *
 * Drawn with a conic gradient behind a punched-out centre rather than SVG
 * arcs — two slices need no path maths, and the ring stays crisp at any size.
 */
export function AccessGrantsCard({
  summary,
  isLoading,
  error,
  onRetry,
}: AccessGrantsCardProps) {
  const { granted, restricted, totalUsers, grantedPercent } = summary;

  return (
    <SurfaceCard className="flex h-full flex-col p-5.5">
      <h2 className="mb-4.5 text-[15px] font-bold">Access Grants</h2>

      {isLoading && <LoadingState label="Loading grants…" />}
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && totalUsers === 0 && (
        <EmptyState
          title="No permission data available"
          description="Grants appear here once users have signed in."
        />
      )}

      {!isLoading && !error && totalUsers > 0 && (
        <>
          <div className="flex justify-center">
            <div
              role="img"
              aria-label={`${granted} of ${totalUsers} users hold active access`}
              className="relative h-42.5 w-42.5"
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: `conic-gradient(var(--chart-granted) 0% ${grantedPercent}%, var(--chart-restricted) ${grantedPercent}% 100%)`,
                }}
              />
              <div className="absolute top-4.25 left-4.25 flex h-34 w-34 flex-col items-center justify-center rounded-full bg-card">
                <span className="text-[28px] font-extrabold tabular-nums">{granted}</span>
                <span className="text-[11px] text-subtle-foreground">Granted</span>
              </div>
            </div>
          </div>

          <div className="mt-4.5 flex justify-center gap-5.5 text-[12.5px] text-secondary-foreground">
            <LegendItem color="var(--chart-granted)" label="Granted" value={granted} />
            <LegendItem
              color="var(--chart-restricted)"
              label="Restricted"
              value={restricted}
            />
          </div>

          {/* mt-auto is what makes this card match the height of the taller
              card beside it instead of leaving a gap under the legend. */}
          <div className="mt-auto border-t border-row-border pt-4.5">
            <p className="mb-2 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase">
              Access Rate
            </p>
            <p className="text-[22px] font-extrabold tabular-nums">{grantedPercent}%</p>
            <p className="mt-0.5 text-[12px] text-subtle-foreground">
              of directory users hold active access
            </p>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-2.25 w-2.25 rounded-full"
        style={{ background: color }}
      />
      {label} : {value}
    </span>
  );
}
