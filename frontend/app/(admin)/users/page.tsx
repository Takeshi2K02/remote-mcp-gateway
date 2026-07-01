import { UsersTable } from "@/features/users/components/users-table";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Administer gateway user accounts, status, security policies, and access credentials.
        </p>
      </div>

      <section aria-label="User Accounts Directory">
        <UsersTable />
      </section>
    </div>
  );
}
