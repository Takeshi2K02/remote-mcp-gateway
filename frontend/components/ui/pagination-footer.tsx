"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination } from "@/lib/hooks/use-pagination";

interface PaginationFooterProps {
  pagination: Pagination<unknown>;
  /** Plural noun for the counted thing, e.g. "tables". */
  noun: string;
}

export function PaginationFooter({ pagination, noun }: PaginationFooterProps) {
  const { from, to, total, page, pageCount, canGoBack, canGoForward, next, previous } =
    pagination;

  return (
    <div className="flex items-center justify-between border-t border-border px-5.5 py-4">
      <p className="text-[12.5px] text-subtle-foreground">
        Showing <b className="text-foreground">{from}</b> to{" "}
        <b className="text-foreground">{to}</b> of{" "}
        <b className="text-foreground">{total}</b> {noun}
      </p>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={previous}
          disabled={!canGoBack}
          aria-label="Previous page"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-[7px] bg-secondary text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="text-[12.5px] text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={!canGoForward}
          aria-label="Next page"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-[7px] bg-secondary text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
