import type {
  CheckedState,
  DatabaseNode,
  PermissionChange,
  ServerNode,
} from "../types/permission-tree.types";

/**
 * The edits an admin has made but not yet saved.
 *
 * Three sets rather than a mutated copy of the tree, because the gateway
 * stores three independent permission tables and the save call is a diff
 * against what was loaded. Keeping the draft in the same shape as the storage
 * means the diff is a set comparison instead of a tree walk.
 */
export interface GrantDraft {
  servers: ReadonlySet<number>;
  databases: ReadonlySet<number>;
  tables: ReadonlySet<number>;
}

export const EMPTY_DRAFT: GrantDraft = {
  servers: new Set(),
  databases: new Set(),
  tables: new Set(),
};

export function draftFromTree(tree: readonly ServerNode[]): GrantDraft {
  const servers = new Set<number>();
  const databases = new Set<number>();
  const tables = new Set<number>();

  for (const server of tree) {
    if (server.checked) servers.add(server.server_id);
    for (const database of server.databases) {
      if (database.checked) databases.add(database.database_id);
      for (const table of database.tables) {
        if (table.checked) tables.add(table.table_id);
      }
    }
  }

  return { servers, databases, tables };
}

/* -------------------------------------------------------------------------
   Derived checkbox states
   ------------------------------------------------------------------------- */

export function databaseState(
  database: DatabaseNode,
  draft: GrantDraft
): CheckedState {
  const total = database.tables.length;

  // A database with no discovered tables can still be granted on its own —
  // there are no children to average, so its own record is the whole answer.
  if (total === 0) {
    return draft.databases.has(database.database_id) ? "checked" : "unchecked";
  }

  let checked = 0;
  for (const table of database.tables) {
    if (draft.tables.has(table.table_id)) checked += 1;
  }

  if (checked === total) return "checked";
  if (checked > 0) return "indeterminate";
  // Granted at the database level with nothing beneath it selected is a real
  // state the gateway can hold, and showing it as empty would hide access the
  // user actually has.
  return draft.databases.has(database.database_id) ? "indeterminate" : "unchecked";
}

export function serverState(server: ServerNode, draft: GrantDraft): CheckedState {
  if (server.databases.length === 0) {
    return draft.servers.has(server.server_id) ? "checked" : "unchecked";
  }

  let allChecked = true;
  let anyTouched = false;

  for (const database of server.databases) {
    const state = databaseState(database, draft);
    if (state !== "checked") allChecked = false;
    if (state !== "unchecked") anyTouched = true;
  }

  if (allChecked) return "checked";
  if (anyTouched) return "indeterminate";
  return draft.servers.has(server.server_id) ? "indeterminate" : "unchecked";
}

export function tableState(tableId: number, draft: GrantDraft): CheckedState {
  return draft.tables.has(tableId) ? "checked" : "unchecked";
}

/* -------------------------------------------------------------------------
   Cascading edits
   ------------------------------------------------------------------------- */

interface MutableDraft {
  servers: Set<number>;
  databases: Set<number>;
  tables: Set<number>;
}

function copy(draft: GrantDraft): MutableDraft {
  return {
    servers: new Set(draft.servers),
    databases: new Set(draft.databases),
    tables: new Set(draft.tables),
  };
}

function applyDatabase(next: MutableDraft, database: DatabaseNode, grant: boolean) {
  if (grant) {
    next.databases.add(database.database_id);
    for (const table of database.tables) next.tables.add(table.table_id);
  } else {
    next.databases.delete(database.database_id);
    for (const table of database.tables) next.tables.delete(table.table_id);
  }
}

/** Selecting a server selects everything under it, and vice versa. */
export function toggleServer(
  draft: GrantDraft,
  server: ServerNode,
  grant: boolean
): GrantDraft {
  const next = copy(draft);

  if (grant) next.servers.add(server.server_id);
  else next.servers.delete(server.server_id);

  for (const database of server.databases) applyDatabase(next, database, grant);
  return next;
}

export function toggleDatabase(
  draft: GrantDraft,
  server: ServerNode,
  database: DatabaseNode,
  grant: boolean
): GrantDraft {
  const next = copy(draft);
  applyDatabase(next, database, grant);

  // The gateway inserts the parent rows itself when a child is granted, so the
  // draft mirrors that — otherwise the diff would omit a server grant the save
  // is going to perform anyway, and the next load would look like a change.
  if (grant) next.servers.add(server.server_id);
  return next;
}

export function toggleTable(
  draft: GrantDraft,
  server: ServerNode,
  database: DatabaseNode,
  tableId: number,
  grant: boolean
): GrantDraft {
  const next = copy(draft);

  if (grant) {
    next.tables.add(tableId);
    next.databases.add(database.database_id);
    next.servers.add(server.server_id);
  } else {
    next.tables.delete(tableId);
  }

  return next;
}

export function selectAll(tree: readonly ServerNode[]): GrantDraft {
  const next: MutableDraft = { servers: new Set(), databases: new Set(), tables: new Set() };

  for (const server of tree) {
    next.servers.add(server.server_id);
    for (const database of server.databases) applyDatabase(next, database, true);
  }

  return next;
}

export function clearAll(): GrantDraft {
  return { servers: new Set(), databases: new Set(), tables: new Set() };
}

/* -------------------------------------------------------------------------
   Save
   ------------------------------------------------------------------------- */

export function isDirty(initial: GrantDraft, draft: GrantDraft): boolean {
  return (
    !sameSet(initial.servers, draft.servers) ||
    !sameSet(initial.databases, draft.databases) ||
    !sameSet(initial.tables, draft.tables)
  );
}

/**
 * The change list sent to `PUT /users/{id}/permissions`.
 *
 * Revokes are emitted before grants. Revoking a server cascades server-side to
 * every database and table beneath it, so a grant that arrived first would be
 * silently deleted by a later revoke in the same batch.
 */
export function buildChanges(initial: GrantDraft, draft: GrantDraft): PermissionChange[] {
  const revokes: PermissionChange[] = [];
  const grants: PermissionChange[] = [];

  const collect = (
    level: PermissionChange["level"],
    before: ReadonlySet<number>,
    after: ReadonlySet<number>
  ) => {
    for (const id of before) {
      if (!after.has(id)) revokes.push({ level, resource_id: id, grant: false });
    }
    for (const id of after) {
      if (!before.has(id)) grants.push({ level, resource_id: id, grant: true });
    }
  };

  // Within each phase the order is server -> database -> table, matching the
  // direction the gateway's own cascade runs.
  collect("server", initial.servers, draft.servers);
  collect("database", initial.databases, draft.databases);
  collect("table", initial.tables, draft.tables);

  return [...revokes, ...grants];
}

/* -------------------------------------------------------------------------
   Counts
   ------------------------------------------------------------------------- */

export interface GrantCounts {
  serversGranted: number;
  serversTotal: number;
  databasesGranted: number;
  databasesTotal: number;
  tablesGranted: number;
  tablesTotal: number;
}

/** Fully-granted servers and databases — the summary line's "3/5". */
export function countGrants(tree: readonly ServerNode[], draft: GrantDraft): GrantCounts {
  let serversGranted = 0;
  let databasesGranted = 0;
  let databasesTotal = 0;
  let tablesTotal = 0;

  for (const server of tree) {
    if (serverState(server, draft) === "checked") serversGranted += 1;
    for (const database of server.databases) {
      databasesTotal += 1;
      tablesTotal += database.tables.length;
      if (databaseState(database, draft) === "checked") databasesGranted += 1;
    }
  }

  return {
    serversGranted,
    serversTotal: tree.length,
    databasesGranted,
    databasesTotal,
    tablesGranted: draft.tables.size,
    tablesTotal,
  };
}

function sameSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}
