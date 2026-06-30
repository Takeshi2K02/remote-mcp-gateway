import { DatabasesTable } from "@/features/databases/components/databases-table";

export default function DatabasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Databases</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage registered databases across active SQL Server nodes.
        </p>
      </div>

      <section aria-label="Databases Registries">
        <DatabasesTable />
      </section>
    </div>
  );
}
