"use client";

import { useEffect, useMemo, useState } from "react";

export interface Pagination<T> {
  items: T[];
  page: number;
  pageCount: number;
  /** 1-based index of the first row shown; 0 when the set is empty. */
  from: number;
  to: number;
  total: number;
  canGoBack: boolean;
  canGoForward: boolean;
  next: () => void;
  previous: () => void;
}

/**
 * Client-side paging over an already-fetched list.
 *
 * The console's collections are small enough to arrive in one request, and
 * paging locally keeps search and filtering instant. When a filter shrinks the
 * set below the current page, the page snaps back rather than showing an empty
 * slice of a non-empty result.
 */
export function usePagination<T>(items: T[], pageSize: number): Pagination<T> {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    // Reacting to the item set shrinking underneath us — an external signal,
    // not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    items: pageItems,
    page: safePage,
    pageCount,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
    total: items.length,
    canGoBack: safePage > 1,
    canGoForward: safePage < pageCount,
    next: () => setPage((current) => Math.min(current + 1, pageCount)),
    previous: () => setPage((current) => Math.max(current - 1, 1)),
  };
}
