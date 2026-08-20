"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useMutation } from "@/lib/hooks/use-mutation";
import { getUsers, updateUser } from "../services/users.service";
import type { User } from "../types/user.types";

const fetchUsers = () => getUsers();

/** Display shape for a directory row — every derived label resolved up front. */
export interface UserRow extends User {
  displayName: string;
  status: "Active" | "Inactive";
  role: "Admin" | "Standard";
  /**
   * The API answers this as a boolean, so the console shows the two states it
   * can actually distinguish rather than inventing a "Partial".
   */
  access: "Granted" | "Revoked";
}

export function toUserRow(user: User): UserRow {
  return {
    ...user,
    displayName: user.full_name || user.email,
    status: user.is_active ? "Active" : "Inactive",
    role: user.is_admin ? "Admin" : "Standard",
    access: user.has_permissions ? "Granted" : "Revoked",
  };
}

export function useUsers() {
  const { data, isLoading, error, reload } = useAsyncData(fetchUsers);
  const [search, setSearch] = useState("");

  const update = useMutation(
    useCallback(
      (id: number, patch: Partial<Pick<User, "is_active" | "is_admin">>) =>
        updateUser(id, patch),
      []
    )
  );

  const rows = useMemo(() => (data ?? []).map(toUserRow), [data]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.displayName.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query)
    );
  }, [rows, search]);

  const setUserActive = useCallback(
    async (id: number, isActive: boolean) => {
      const result = await update.run(id, { is_active: isActive });
      if (result) reload();
    },
    [update, reload]
  );

  return {
    rows,
    filteredRows,
    isLoading,
    error,
    reload,
    search,
    setSearch,
    setUserActive,
    isUpdating: update.isPending,
    updateError: update.error,
    isFilteredEmpty: !isLoading && !error && rows.length > 0 && filteredRows.length === 0,
  };
}
