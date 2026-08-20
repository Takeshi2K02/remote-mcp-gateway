"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The three things a data region can show instead of rows.
 *
 * They share one block — centred, 60px of vertical air, a 14px title over a
 * 13px explanation — so a table does not change height or alignment as it
 * moves between loading, empty and loaded.
 */

interface StateBlockProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

function StateBlock({ title, description, className, children }: StateBlockProps) {
  return (
    <div className={cn("px-5 py-15 text-center", className)}>
      <p className="text-sm font-semibold text-secondary-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-[13px] text-subtle-foreground">{description}</p>
      )}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-5 py-15" role="status">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-subtle-foreground" />
      <span className="text-[13px] text-subtle-foreground">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, className, children }: StateBlockProps) {
  return (
    <StateBlock title={title} description={description} className={className}>
      {children}
    </StateBlock>
  );
}

interface ErrorStateProps {
  /** Message from the failed request; shown verbatim under the heading. */
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("px-5 py-15 text-center", className)} role="alert">
      <p className="text-sm font-semibold text-destructive">Could not load this data</p>
      <p className="mt-1.5 text-[13px] text-subtle-foreground">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
