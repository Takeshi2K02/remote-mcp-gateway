import { SQLServersTable } from "@/features/sql-servers/components/sql-servers-table";

export default function SqlServersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">SQL Servers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage registered database endpoints and connection pools.
        </p>
      </div>

      <section aria-label="SQL Server Registries">
        <SQLServersTable />
      </section>
    </div>
  );
}
