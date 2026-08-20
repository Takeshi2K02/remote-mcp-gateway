import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-destructive-bg text-destructive",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
};

// The API returns status words from several different vocabularies — a server
// is "Active", a sync is "Syncing", an audit row is "Success", a grant is
// "Granted". They all render as the same pill, so the word-to-tone mapping is
// resolved once here instead of each table inventing its own conditional.
const TONE_BY_WORD: Record<string, StatusTone> = {
  active: "success",
  healthy: "success",
  connected: "success",
  granted: "success",
  success: "success",
  ok: "success",

  syncing: "warning",
  partial: "warning",
  pending: "warning",
  degraded: "warning",
  checking: "warning",

  error: "danger",
  inactive: "danger",
  revoked: "danger",
  failed: "danger",
  failure: "danger",
  disconnected: "danger",
};

export function toneForStatus(status: string): StatusTone {
  return TONE_BY_WORD[status.trim().toLowerCase()] ?? "neutral";
}

interface StatusBadgeProps {
  status: string;
  /** Override the derived tone where a word is ambiguous (e.g. a role name). */
  tone?: StatusTone;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, tone, size = "md", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-2.75 py-1 text-[11.5px]",
        TONE_CLASSES[tone ?? toneForStatus(status)],
        className
      )}
    >
      {status}
    </span>
  );
}
