"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatWeekday, pluralize } from "@/lib/format";
import type { VolumeSummary } from "../hooks/use-activity";

/** Tallest bar, in pixels. Every other bar is scaled against the peak. */
const MAX_BAR_HEIGHT = 120;
/** Floor so a day with a single event still reads as a bar, not a line. */
const MIN_BAR_HEIGHT = 6;

interface ActivityVolumeCardProps {
  volume: VolumeSummary;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ActivityVolumeCard({
  volume,
  isLoading,
  error,
  onRetry,
}: ActivityVolumeCardProps) {
  const { points, total, average, peakDay, peakCount } = volume;

  return (
    <SurfaceCard className="flex h-full flex-col p-5.5">
      <h2 className="text-[15px] font-bold">Activity Volume</h2>
      <p className="mb-5 text-[12px] text-subtle-foreground">
        Audit events per day, last 7 days
      </p>

      {isLoading && <LoadingState label="Loading activity volume…" />}
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && total === 0 && (
        <EmptyState
          title="No activity in this period"
          description="Nothing has been recorded in the last seven days."
        />
      )}

      {!isLoading && !error && total > 0 && (
        <>
          <div className="flex h-40 items-end gap-3.5 px-1">
            {points.map((point) => (
              <div
                key={point.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10.5px] font-semibold text-subtle-foreground tabular-nums">
                  {point.count}
                </span>
                <div
                  role="img"
                  aria-label={`${formatWeekday(point.day)}: ${pluralize(point.count, "event")}`}
                  className="w-full max-w-8.5 rounded-t-lg rounded-b-[3px] bg-chart-bar"
                  style={{
                    height:
                      peakCount === 0
                        ? MIN_BAR_HEIGHT
                        : Math.max(
                            MIN_BAR_HEIGHT,
                            Math.round((point.count / peakCount) * MAX_BAR_HEIGHT)
                          ),
                  }}
                />
                <span className="text-[11px] font-semibold text-subtle-foreground">
                  {formatWeekday(point.day)}
                </span>
              </div>
            ))}
          </div>

          {/* mt-auto keeps this footer pinned to the card's base so the pair of
              cards in this row end level. */}
          <dl className="mt-auto flex flex-wrap gap-7 border-t border-row-border pt-4.5">
            <Metric label="Total This Week" value={`${total} events`} />
            <Metric label="Daily Average" value={String(average)} />
            <Metric label="Peak Day" value={peakDay} />
          </dl>
        </>
      )}
    </SurfaceCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd className="text-[18px] font-extrabold">{value}</dd>
    </div>
  );
}
