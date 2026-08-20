"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckedState } from "../types/permission-tree.types";

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-4.25 w-4.25",
  lg: "h-4.5 w-4.5",
} as const;

interface TriStateCheckboxProps {
  state: CheckedState;
  onChange: () => void;
  /** Names the resource being toggled — the control has no visible label. */
  label: string;
  size?: keyof typeof SIZE_CLASSES;
  disabled?: boolean;
  className?: string;
}

/**
 * Three-state checkbox for the access tree.
 *
 * `aria-checked="mixed"` is what tells a screen reader that a server is partly
 * granted; the dimmed fill is only the sighted half of that signal.
 */
export function TriStateCheckbox({
  state,
  onChange,
  label,
  size = "md",
  disabled = false,
  className,
}: TriStateCheckboxProps) {
  const ariaChecked = state === "indeterminate" ? "mixed" : state === "checked";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={ariaChecked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZE_CLASSES[size],
        state === "checked" && "border-primary bg-primary text-primary-foreground",
        state === "indeterminate" &&
          "border-primary bg-primary text-primary-foreground opacity-55",
        state === "unchecked" && "border-input bg-card hover:border-ring",
        className
      )}
    >
      {state === "checked" && (
        <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3.5} />
      )}
      {state === "indeterminate" && (
        <Minus aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={4} />
      )}
    </button>
  );
}
