"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useSessionDetails } from "@/features/dashboard/hooks/use-session-details";
import { formatDateTime, pluralize } from "@/lib/format";

/**
 * Facts about the signed-in session, all read from the app token itself.
 *
 * The design showed a session-timeout dropdown and a re-auth switch here. Both
 * are gateway-side policy with no endpoint to change them, so the timeout is
 * reported as the read-only value it is rather than offered as a control that
 * would silently do nothing.
 */
export function SessionSecurityCard() {
  const { userName, identity, startedAt, expiresAt, minutesRemaining } =
    useSessionDetails();

  const sessionLengthMinutes =
    startedAt && expiresAt
      ? Math.round((expiresAt.getTime() - startedAt.getTime()) / 60_000)
      : null;

  return (
    <SurfaceCard className="p-5.5">
      <h2 className="mb-1 text-[15px] font-bold">Session &amp; Security</h2>
      <p className="mb-3.5 text-[13px] text-muted-foreground">
        Controls and facts that apply to this admin session and account.
      </p>

      <dl className="flex flex-col">
        <Row
          label="Signed in as"
          hint={identity ? `Entra object ${identity}` : "Identity unavailable"}
        >
          <span className="text-[13px] font-semibold">{userName ?? "—"}</span>
        </Row>

        <Row
          label="Session timeout"
          hint="Set by the gateway; not editable from the console"
        >
          <span className="font-mono text-[13px] text-muted-foreground">
            {sessionLengthMinutes === null
              ? "—"
              : pluralize(sessionLengthMinutes, "minute")}
          </span>
        </Row>

        <Row
          label="Expires"
          hint={
            minutesRemaining === null
              ? "No active token"
              : `${pluralize(minutesRemaining, "minute")} remaining`
          }
        >
          <span className="font-mono text-[13px] text-muted-foreground">
            {expiresAt ? formatDateTime(expiresAt.toISOString()) : "—"}
          </span>
        </Row>

        <Row
          label="Current session"
          hint={
            startedAt
              ? `Started ${formatDateTime(startedAt.toISOString())}`
              : "Start time unavailable"
          }
        >
          <StatusBadge status="This device" tone="success" />
        </Row>
      </dl>
    </SurfaceCard>
  );
}

interface RowProps {
  label: string;
  hint: string;
  children: React.ReactNode;
}

function Row({ label, hint, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-row-border px-0.5 py-3">
      <div className="min-w-0">
        <dt className="text-[13.5px] font-semibold">{label}</dt>
        <dd className="mt-0.5 truncate text-[12px] text-subtle-foreground">{hint}</dd>
      </div>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}
