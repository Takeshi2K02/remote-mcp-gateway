import { pluralize } from "@/lib/format";
import type { AuditLogEntry } from "../services/audit-logs.service";

interface AuditLogDetailProps {
  log: AuditLogEntry;
}

/**
 * The panel a row opens onto. The detail is the executed statement or the
 * failure reason, so it is set in the mono face on its own white block rather
 * than run into the tinted background.
 */
export function AuditLogDetail({ log }: AuditLogDetailProps) {
  const facts = [
    ["Request", log.request_id],
    ["Duration", log.duration_ms === null ? null : `${log.duration_ms} ms`],
    ["Rows", log.row_count === null ? null : pluralize(log.row_count, "row")],
    ["Actor", log.actor_email || null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="border-t border-border bg-field px-5.5 pt-3.5 pb-4.5">
      <p className="mb-1.5 text-[11px] font-bold tracking-[0.05em] text-subtle-foreground">
        DETAIL
      </p>
      <p className="rounded-md border border-border bg-card px-3.5 py-3 font-mono text-[12.5px] leading-relaxed break-words text-secondary-foreground">
        {log.detail ?? "No further detail was recorded for this event."}
      </p>

      {facts.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10.5px] font-semibold text-subtle-foreground">
                {label.toUpperCase()}
              </dt>
              <dd className="font-mono text-[12px] text-muted-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
