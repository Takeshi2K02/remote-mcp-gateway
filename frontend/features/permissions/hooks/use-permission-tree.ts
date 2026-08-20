"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@/lib/hooks/use-mutation";
import { getPermissionTree, savePermissions } from "../services/permissions.service";
import type { DatabaseNode, ServerNode } from "../types/permission-tree.types";
import {
  buildChanges,
  clearAll,
  countGrants,
  draftFromTree,
  EMPTY_DRAFT,
  isDirty,
  selectAll,
  toggleDatabase,
  toggleServer,
  toggleTable,
  type GrantDraft,
} from "../lib/grant-draft";
import { filterTree } from "../lib/tree-search";

const NO_TREE: ServerNode[] = [];

/**
 * Everything loaded for one user, tagged with whose it is.
 *
 * Tagging is what removes the stale-state window: while a newly selected
 * user's tree is in flight, `userId` no longer matches and the hook reports
 * empty rather than the previous user's grants — so the Save button can never
 * be armed with one person's edits against another person's row.
 */
interface LoadedTree {
  userId: number;
  tree: ServerNode[];
  initial: GrantDraft;
  draft: GrantDraft;
}

/**
 * The access tree for one user, with an explicit save.
 *
 * `initial` is what the gateway returned, `draft` is what the admin has built
 * on top of it. Nothing is written until Save; Discard is just dropping the
 * draft back to `initial`.
 */
export function usePermissionTree(userId: number | null) {
  const [loaded, setLoaded] = useState<LoadedTree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState("");
  const [expandedServers, setExpandedServers] = useState<ReadonlySet<number>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<ReadonlySet<number>>(
    new Set()
  );

  const save = useMutation(savePermissions);

  useEffect(() => {
    // No user selected: nothing to fetch, and nothing to tear down either —
    // the tag on `loaded` already makes any previous user's data invisible.
    if (userId === null) return;

    let active = true;

    async function load(id: number) {
      setIsLoading(true);
      setError(null);
      try {
        const tree = await getPermissionTree(id);
        if (!active) return;

        const initial = draftFromTree(tree);
        setLoaded({ userId: id, tree, initial, draft: initial });
        setSearch("");
        // Servers open, databases closed: the design's starting shape, and the
        // only one that stays readable with dozens of tables per database.
        setExpandedServers(new Set(tree.map((server) => server.server_id)));
        setExpandedDatabases(new Set());
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Could not load the access tree."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load(userId);

    return () => {
      active = false;
    };
  }, [userId, reloadToken]);

  const current = loaded !== null && loaded.userId === userId ? loaded : null;
  const tree = current?.tree ?? NO_TREE;
  const draft = current?.draft ?? EMPTY_DRAFT;

  const visibleTree = useMemo(() => filterTree(tree, search), [tree, search]);
  const counts = useMemo(() => countGrants(tree, draft), [tree, draft]);
  const dirty = useMemo(
    () => (current === null ? false : isDirty(current.initial, current.draft)),
    [current]
  );

  /** Applies an edit to the draft, ignoring it if the user changed underneath. */
  const editDraft = useCallback((edit: (draft: GrantDraft) => GrantDraft) => {
    setLoaded((state) => (state === null ? state : { ...state, draft: edit(state.draft) }));
  }, []);

  const handleToggleServer = useCallback(
    (server: ServerNode, grant: boolean) =>
      editDraft((current) => toggleServer(current, server, grant)),
    [editDraft]
  );

  const handleToggleDatabase = useCallback(
    (server: ServerNode, database: DatabaseNode, grant: boolean) =>
      editDraft((current) => toggleDatabase(current, server, database, grant)),
    [editDraft]
  );

  const handleToggleTable = useCallback(
    (server: ServerNode, database: DatabaseNode, tableId: number, grant: boolean) =>
      editDraft((current) => toggleTable(current, server, database, tableId, grant)),
    [editDraft]
  );

  const toggleServerExpanded = useCallback(
    (serverId: number) => setExpandedServers((state) => toggled(state, serverId)),
    []
  );

  const toggleDatabaseExpanded = useCallback(
    (databaseId: number) => setExpandedDatabases((state) => toggled(state, databaseId)),
    []
  );

  const expandAll = useCallback(() => {
    setExpandedServers(new Set(tree.map((server) => server.server_id)));
    setExpandedDatabases(
      new Set(
        tree.flatMap((server) => server.databases.map((database) => database.database_id))
      )
    );
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpandedServers(new Set());
    setExpandedDatabases(new Set());
  }, []);

  const commit = useCallback(async () => {
    if (current === null) return false;

    const changes = buildChanges(current.initial, current.draft);
    if (changes.length === 0) return true;

    const result = await save.run(current.userId, changes);
    if (result === null) return false;

    // Refetch rather than promoting the draft locally: the gateway inserts
    // parent grants of its own accord, so the saved state is not always the
    // draft that was sent.
    setReloadToken((token) => token + 1);
    return true;
  }, [current, save]);

  return {
    tree,
    visibleTree,
    draft,
    counts,
    isDirty: dirty,
    isLoading,
    error,
    reload: useCallback(() => setReloadToken((token) => token + 1), []),

    search,
    setSearch,
    expandedServers,
    expandedDatabases,
    toggleServerExpanded,
    toggleDatabaseExpanded,
    expandAll,
    collapseAll,

    toggleServer: handleToggleServer,
    toggleDatabase: handleToggleDatabase,
    toggleTable: handleToggleTable,
    selectAll: useCallback(() => editDraft(() => selectAll(tree)), [editDraft, tree]),
    clearAll: useCallback(() => editDraft(() => clearAll()), [editDraft]),
    discard: useCallback(
      () => setLoaded((state) => (state === null ? state : { ...state, draft: state.initial })),
      []
    ),

    save: commit,
    isSaving: save.isPending,
    saveError: save.error,
  };
}

function toggled(current: ReadonlySet<number>, id: number): ReadonlySet<number> {
  const next = new Set(current);
  if (!next.delete(id)) next.add(id);
  return next;
}
