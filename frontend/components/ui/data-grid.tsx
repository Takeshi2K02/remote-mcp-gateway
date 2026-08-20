"use client";

import { createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * The console's tables are CSS grids, not <table>s — the design gives each
 * column a fractional weight and lets cells hold avatars, pills and buttons.
 *
 * The column template belongs to the table, not to each row, so it is carried
 * in context. Repeating the template string on the header and again on every
 * row is how these grids fall out of alignment when a column is added.
 *
 * `minWidth` keeps the columns from crushing on a narrow viewport; the scroll
 * container it needs is part of DataGrid rather than each caller's problem.
 */

const ColumnsContext = createContext<string | null>(null);

function useColumns(component: string): string {
  const columns = useContext(ColumnsContext);
  if (!columns) {
    throw new Error(`${component} must be rendered inside <DataGrid>`);
  }
  return columns;
}

interface DataGridProps {
  /** A grid-template-columns value, e.g. "1.4fr 1.8fr 0.6fr". */
  columns: string;
  /** Width below which the grid scrolls horizontally instead of compressing. */
  minWidth?: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}

export function DataGrid({
  columns,
  minWidth = 900,
  label,
  className,
  children,
}: DataGridProps) {
  const style = useMemo(() => ({ minWidth }), [minWidth]);

  return (
    <ColumnsContext value={columns}>
      <div className={cn("overflow-x-auto", className)}>
        <div role="table" aria-label={label} style={style}>
          {children}
        </div>
      </div>
    </ColumnsContext>
  );
}

interface DataGridHeaderProps {
  /**
   * One entry per column. A blank string renders a spacer column — the design
   * uses those to reserve room for a trailing action cell.
   */
  headings: readonly string[];
  /** Right-align the final heading, matching an actions column. */
  alignLastRight?: boolean;
  className?: string;
}

export function DataGridHeader({
  headings,
  alignLastRight = false,
  className,
}: DataGridHeaderProps) {
  const columns = useColumns("DataGridHeader");

  return (
    <div
      role="row"
      style={{ gridTemplateColumns: columns }}
      className={cn(
        "grid gap-4 px-5.5 py-3 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase",
        className
      )}
    >
      {headings.map((heading, index) => (
        <div
          role="columnheader"
          // Headings are fixed per table and may legitimately repeat as blanks,
          // so position is the only stable identity available here.
          key={`${heading}-${index}`}
          className={cn(alignLastRight && index === headings.length - 1 && "text-right")}
        >
          {heading}
        </div>
      ))}
    </div>
  );
}

interface DataGridRowProps extends React.ComponentProps<"div"> {
  /** Rows that open a detail panel become buttons for keyboard users. */
  onSelect?: () => void;
  /** Vertical padding: comfortable by default, tighter for dense lists. */
  density?: "default" | "compact";
}

export function DataGridRow({
  onSelect,
  density = "default",
  className,
  children,
  ...props
}: DataGridRowProps) {
  const columns = useColumns("DataGridRow");

  return (
    <div
      role="row"
      style={{ gridTemplateColumns: columns }}
      {...(onSelect
        ? {
            tabIndex: 0,
            onClick: onSelect,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            },
          }
        : {})}
      className={cn(
        "grid items-center gap-4 border-t border-row-border px-5.5",
        density === "compact" ? "py-3.25" : "py-4",
        onSelect && "cursor-pointer focus-visible:bg-row-hover focus-visible:outline-none",
        "hover:bg-row-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** A cell. `role="cell"` is what keeps the grid readable to assistive tech. */
export function DataGridCell({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="cell" className={cn("min-w-0", className)} {...props} />;
}

/** Monospace cell — hostnames, ids, schema-qualified names, timestamps. */
export function DataGridMonoCell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DataGridCell
      className={cn("truncate font-mono text-[12.5px] text-muted-foreground", className)}
      {...props}
    />
  );
}
