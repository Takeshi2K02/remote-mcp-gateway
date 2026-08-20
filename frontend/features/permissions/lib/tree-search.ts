import type { ServerNode } from "../types/permission-tree.types";

export function qualifiedTableName(schema: string, table: string): string {
  return `${schema}.${table}`;
}

/**
 * Narrows the tree to what matches a query, keeping the hierarchy intact.
 *
 * A branch survives if it matches or if anything under it does — searching for
 * a table name has to leave its database and server in place, or the result
 * would be a flat list with no way to tell which server it came from.
 *
 * Returns the tree unchanged for an empty query so the common case allocates
 * nothing.
 */
export function filterTree(tree: readonly ServerNode[], query: string): ServerNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return tree as ServerNode[];

  const result: ServerNode[] = [];

  for (const server of tree) {
    const serverMatches = server.server_name.toLowerCase().includes(needle);

    const databases = server.databases
      .map((database) => {
        const databaseMatches = database.database_name.toLowerCase().includes(needle);

        // A matching database keeps all of its tables — the admin asked for
        // that database, not for a subset of it.
        const tables =
          databaseMatches || serverMatches
            ? database.tables
            : database.tables.filter((table) =>
                qualifiedTableName(table.schema_name, table.table_name)
                  .toLowerCase()
                  .includes(needle)
              );

        if (!databaseMatches && !serverMatches && tables.length === 0) return null;
        return { ...database, tables };
      })
      .filter((database) => database !== null);

    if (!serverMatches && databases.length === 0) continue;
    result.push({ ...server, databases });
  }

  return result;
}
