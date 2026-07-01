export type CheckedState = "checked" | "unchecked" | "indeterminate";

export interface TableNode {
  table_id: number;
  table_name: string;
  schema_name: string;
  checked: boolean;
}

export interface DatabaseNode {
  database_id: number;
  database_name: string;
  checked: boolean;
  tables: TableNode[];
}

export interface ServerNode {
  server_id: number;
  server_name: string;
  checked: boolean;
  databases: DatabaseNode[];
}

export interface PermissionChange {
  level: "server" | "database" | "table";
  resource_id: number;
  grant: boolean;
}
