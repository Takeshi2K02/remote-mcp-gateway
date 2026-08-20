"use client";

import { SurfaceCard } from "@/components/ui/surface-card";
import { formatTime, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionDetails } from "../hooks/use-session-details";

/** Minutes below which the remaining-time reading turns amber. */
const EXPIRY_WARNING_MINUTES = 5;

export function SessionDetailsBar() {
  const { userName, identity, startedAt, expiresAt, minutesRemaining } =
    useSessionDetails();

  return (
    <SurfaceCard className="mb-4 flex flex-wrap items-center gap-x-9 gap-y-3 px-5.5 py-4">
      <h2 className="text-[13px] font-bold text-foreground">Session Details</h2>

      {userName === null ? (
        <p className="text-[13px] text-subtle-foreground">No active user session</p>
      ) : (
        <dl className="flex flex-wrap gap-x-9 gap-y-3">
          <Fact label="USER" value={userName} />
          <Fact label="STARTED" mono value={startedAt ? formatTime(startedAt.toISOString()) : "—"} />
          <Fact
            label="EXPIRES IN"
            mono
            value={minutesRemaining === null ? "—" : `${minutesRemaining} min`}
            className={
              minutesRemaining !== null && minutesRemaining <= EXPIRY_WARNING_MINUTES
                ? "text-warning"
                : "text-success"
            }
            title={expiresAt?.toLocaleString()}
          />
          {/* The design showed the client IP here. The browser cannot learn its
              own public address, and the gateway does not report it, so this
              carries the identity the session is actually bound to instead. */}
          <Fact label="IDENTITY" mono value={shortId(identity)} title={identity ?? undefined} />
        </dl>
      )}
    </SurfaceCard>
  );
}

interface FactProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
  title?: string;
}

function Fact({ label, value, mono, className, title }: FactProps) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-subtle-foreground">{label}</dt>
      <dd
        title={title}
        className={cn(
          "text-[13px]",
          mono ? "font-mono" : "font-semibold",
          className ?? "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
