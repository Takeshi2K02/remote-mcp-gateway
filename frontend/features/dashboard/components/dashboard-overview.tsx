"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useActivity } from "../hooks/use-activity";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import { AccessGrantsCard } from "./access-grants-card";
import { ActivityVolumeCard } from "./activity-volume-card";
import { RecentActivityCard } from "./recent-activity-card";
import { SessionDetailsBar } from "./session-details-bar";
import { StatTiles } from "./stat-tiles";
import { SystemHealthCard } from "./system-health-card";

/**
 * Composes the dashboard from cards that each take their data as props.
 *
 * The two hooks live here, at the one place that needs both — the resource
 * counts feed the tiles and the donut, and the audit query feeds the activity
 * list and the volume chart, so fetching inside each card would issue the same
 * request twice.
 *
 * Both paired rows use `items-stretch` (grid's default) with `h-full` cards so
 * the shorter card grows to meet the taller one rather than leaving the row
 * ragged along the bottom.
 */
export function DashboardOverview() {
  const summary = useDashboardSummary();
  const activity = useActivity();

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Manage your SQL Server database registries, users, permissions, and settings."
      />

      <StatTiles
        summary={summary.summary}
        isLoading={summary.isLoading}
        hasError={summary.error !== null}
      />

      <SessionDetailsBar />

      <div className="mb-4 grid gap-4 lg:grid-cols-[0.75fr_1.6fr]">
        <AccessGrantsCard
          summary={summary.summary}
          isLoading={summary.isLoading}
          error={summary.error}
          onRetry={summary.reload}
        />
        <RecentActivityCard
          entries={activity.recent}
          isLoading={activity.isLoading}
          error={activity.error}
          onRetry={activity.reload}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <ActivityVolumeCard
          volume={activity.volume}
          isLoading={activity.isLoading}
          error={activity.error}
          onRetry={activity.reload}
        />
        <SystemHealthCard />
      </div>
    </>
  );
}
