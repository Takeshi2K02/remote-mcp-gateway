"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name; the design shows no visible label beside these fields. */
  label: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground"
        strokeWidth={2}
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-field py-2.5 pr-3 pl-9 text-[13px] text-foreground"
      />
    </div>
  );
}
