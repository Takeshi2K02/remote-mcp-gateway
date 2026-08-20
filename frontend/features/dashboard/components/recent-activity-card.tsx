"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-states";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTime, formatShortDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/features/audit-logs/services/audit-logs.service";

interface RecentActivityCardProps {
  entries: readonly AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function RecentActivityCard({
  entries,
  isLoading,
  error,
  onRetry,
}: RecentActivityCardProps) {
  return (
    <SurfaceCard className="flex h-full min-w-0 flex-col overflow-hidden p-5.5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Recent Activity</h2>
        <Link
          href="/audit-logs"
          aria-label="View all audit events"
          title="View all audit events"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowRight aria-hidden="true" className="h-3.75 w-3.75" strokeWidth={1.8} />
        </Link>
      </div>

      {isLoading && <LoadingState label="Loading activity…" />}
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!isLoading && !error && entries.length === 0 && (
        <EmptyState
          title="No activity recorded yet"
          description="Tool calls and admin actions show up here as they happen."
        />
      )}

      {!isLoading && !error && entries.length > 0 && (
        <ul>
          <li className="flex gap-3 border-b border-row-border px-1 pb-2.5 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase">
            <span className="w-37.5 shrink-0">Actor</span>
            <span className="min-w-0 flex-1">Action &amp; Target</span>
            <span className="w-20 shrink-0 text-right">Time</span>
          </li>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border-b border-row-border px-1 py-3 last:border-b-0"
            >
              <span className="flex w-37.5 min-w-0 shrink-0 items-center gap-2.25">
                <AvatarInitials
                  size="xs"
                  name={entry.actor_name}
                  seed={entry.actor_email || entry.actor_name}
                />
                <span className="truncate text-[12.5px] font-semibold">
                  {entry.actor_name}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12px] text-link">
                  {entry.action}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                  {entry.target}
                </span>
              </span>
              <span
                title={formatDateTime(entry.created_at)}
                className="w-20 shrink-0 text-right text-[11.5px] text-subtle-foreground"
              >
                {formatShortDateTime(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
