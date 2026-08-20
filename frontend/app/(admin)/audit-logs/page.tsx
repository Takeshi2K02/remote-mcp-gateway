import { PageHeader } from "@/components/layout/page-header";
import { AuditLogsTable } from "@/features/audit-logs/components/audit-logs-table";

export default function AuditLogsPage() {
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Track admin operations, tool calls, executions, and configuration changes."
      />
      <AuditLogsTable />
    </>
  );
}
