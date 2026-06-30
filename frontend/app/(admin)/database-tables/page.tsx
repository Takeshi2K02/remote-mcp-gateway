import { TablesTable } from "@/features/tables/components/tables-table";

export default function DatabaseTablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tables</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and inspect registered database tables and access mappings.
        </p>
      </div>

      <section aria-label="Database Tables list">
        <TablesTable />
      </section>
    </div>
  );
}
