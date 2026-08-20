"use client";

import { useMemo } from "react";
import {
  getActivityVolume,
  getAuditLogs,
  type ActivityVolumePoint,
  type AuditLogEntry,
} from "@/features/audit-logs/services/audit-logs.service";
import { useAsyncData } from "@/lib/hooks/use-async-data";

const RECENT_ACTIVITY_LIMIT = 6;

async function fetchActivity(): Promise<{
  recent: AuditLogEntry[];
  volume: ActivityVolumePoint[];
}> {
  const [recent, volume] = await Promise.all([
    getAuditLogs(RECENT_ACTIVITY_LIMIT),
    getActivityVolume(7),
  ]);
  return { recent, volume };
}

export interface VolumeSummary {
  points: ActivityVolumePoint[];
  total: number;
  average: number;
  /** Weekday label of the busiest day, or "—" when the week is empty. */
  peakDay: string;
  /** Largest count in the window; the bar heights are scaled against it. */
  peakCount: number;
}

export function useActivity() {
  const { data, isLoading, error, reload } = useAsyncData(fetchActivity);

  const recent = useMemo(() => data?.recent ?? [], [data]);

  const volume = useMemo<VolumeSummary>(() => {
    const points = data?.volume ?? [];
    const total = points.reduce((sum, point) => sum + point.count, 0);
    const peak = points.reduce<ActivityVolumePoint | null>(
      (best, point) => (best === null || point.count > best.count ? point : best),
      null
    );

    return {
      points,
      total,
      average: points.length === 0 ? 0 : Math.round(total / points.length),
      peakDay:
        peak && peak.count > 0
          ? new Date(`${peak.day}T00:00:00Z`).toLocaleDateString("en-US", {
              weekday: "short",
              timeZone: "UTC",
            })
          : "—",
      peakCount: peak?.count ?? 0,
    };
  }, [data]);

  return { recent, volume, isLoading, error, reload };
}
