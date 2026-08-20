"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncData<T> {
  data: T | null;
  isLoading: boolean;
  /** Human-readable failure text, already unwrapped from the API envelope. */
  error: string | null;
  /** Refetch on demand — used by retry buttons and after a mutation. */
  reload: () => void;
}

/**
 * One fetch-on-mount hook for the whole console.
 *
 * Every page here needs the same three states and the same retry affordance,
 * and hand-rolling that per component is what produced eight slightly
 * different loading spinners in the previous pass. Feature hooks wrap this and
 * add their own shaping; presentation components take the result as props and
 * never call the API themselves.
 *
 * `fetcher` must be stable — wrap it in useCallback at the call site, or
 * declare it at module scope.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    // A slow first request that resolves after the user has already navigated
    // — or after a retry superseded it — must not write its result.
    let active = true;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (active) setData(result);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Something went wrong.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [fetcher, reloadToken]);

  return { data, isLoading, error, reload };
}
