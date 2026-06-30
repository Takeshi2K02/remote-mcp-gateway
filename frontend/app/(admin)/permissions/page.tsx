import { PermissionsTables } from "@/features/permissions/components/permissions-tables";

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Permissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review user access control mappings across registered server, database, and table nodes.
        </p>
      </div>

      <section aria-label="Permissions List">
        <PermissionsTables />
      </section>
    </div>
  );
}
