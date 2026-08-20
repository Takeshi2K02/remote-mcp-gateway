"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowActionProps {
  icon: LucideIcon;
  /** Also the tooltip — these buttons carry no visible text. */
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  /** Spins the icon while the action is in flight. */
  busy?: boolean;
  className?: string;
}

/** The small square icon button that ends a table row. */
export function RowAction({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
  disabled,
  busy,
  className,
}: RowActionProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={(event) => {
        // Rows in the audit log open on click; nothing should ride along with
        // an action press even where the row is inert today.
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[7px] transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "bg-destructive-bg text-destructive hover:brightness-95"
          : "bg-secondary text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("h-3.5 w-3.5", busy && "animate-spin")}
        strokeWidth={1.9}
      />
    </button>
  );
}
