"use client";

import { cn } from "@/lib/utils";

interface FilterTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Filter tables by status". */
  label: string;
  className?: string;
}

/**
 * The pill row above the tables and audit log. A radiogroup rather than a set
 * of buttons: exactly one is always active, and keyboard users need to hear
 * which.
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterTabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1.5", className)}>
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md border px-3.25 py-1.75 text-[12.5px] font-semibold transition-colors",
              isActive
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-muted"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
