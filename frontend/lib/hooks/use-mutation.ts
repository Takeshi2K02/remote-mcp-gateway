"use client";

import { useCallback, useState } from "react";

export interface Mutation<TArgs extends unknown[], TResult> {
  /**
   * Runs the mutation. Resolves to the result, or to `null` when it failed —
   * the failure text is in `error`, so callers branch on the return value
   * instead of wrapping every call site in its own try/catch.
   */
  run: (...args: TArgs) => Promise<TResult | null>;
  isPending: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * The write-side counterpart to useAsyncData: pending flag, unwrapped error,
 * no thrown exception at the call site.
 *
 * Deliberately does not touch any cache — callers reload the list they own
 * after a successful write, which keeps this usable for the sync endpoints
 * that change several collections at once.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  mutate: (...args: TArgs) => Promise<TResult>
): Mutation<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      setError(null);
      try {
        return await mutate(...args);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong.");
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [mutate]
  );

  return { run, isPending, error, clearError: useCallback(() => setError(null), []) };
}
