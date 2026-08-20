import { apiRequest } from "@/lib/api/http-client";

/**
 * Console read model for `audit_logs`. The API resolves the row's user,
 * server, database and table ids into `actor_name`/`target` server-side, so
 * the table does not have to fetch four more collections to render one line.
 */
export interface AuditLogEntry {
  id: number;
  created_at: string;
  actor_name: string;
  actor_email: string;
  /** Operation performed, e.g. "tool.execute". Shown in the mono face. */
  action: string;
  tool_name: string;
  /** "query_database (AdventureWorks)" — tool plus what it ran against. */
  target: string;
  /** Lowercase, as stored: "success" | "failed". */
  status: string;
  /** Error text, else the statement, else the free-form note. */
  detail: string | null;
  request_id: string;
  duration_ms: number | null;
  row_count: number | null;
}

export interface ActivityVolumePoint {
  /** ISO date (YYYY-MM-DD). Days with no events are present with count 0. */
  day: string;
  count: number;
}

export async function getAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  return apiRequest<AuditLogEntry[]>(`/audit-logs/?limit=${limit}`);
}

export async function getActivityVolume(days = 7): Promise<ActivityVolumePoint[]> {
  return apiRequest<ActivityVolumePoint[]>(`/audit-logs/activity-volume?days=${days}`);
}
