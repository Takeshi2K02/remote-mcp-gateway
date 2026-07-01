"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckedState } from "../types/permission-tree.types";

interface TriStateCheckboxProps {
  state: CheckedState;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TriStateCheckbox({
  state,
  onChange,
  disabled = false,
  className,
  id,
}: TriStateCheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={cn(
        "h-4 w-4 shrink-0 rounded border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer",
        state === "checked" && "bg-primary border-primary text-primary-foreground",
        state === "indeterminate" && "bg-primary/90 border-primary text-primary-foreground",
        state === "unchecked" && "border-input bg-card hover:bg-muted/50",
        className
      )}
    >
      {state === "checked" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {state === "indeterminate" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2 w-2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  );
}
export default TriStateCheckbox;
