"use client";

import { StatsCard } from "@/features/dashboard/components/stats-card";
import { UserCard } from "@/features/dashboard/components/user-card";
import { HealthCard } from "@/features/dashboard/components/health-card";
import { RecentAuditCard } from "@/features/dashboard/components/recent-audit-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your SQL Server database registries, users, permissions, and settings.
        </p>
      </div>

      {/* Main Stats Tiles */}
      <section aria-label="Resource Statistics">
        <StatsCard />
      </section>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <section aria-label="User Profile">
          <UserCard />
        </section>

        {/* System Health Card */}
        <section aria-label="System Health Status">
          <HealthCard />
        </section>

        {/* Recent Audit Activities */}
        <section aria-label="Recent Audit Log" className="lg:col-span-1">
          <RecentAuditCard />
        </section>
      </div>
    </div>
  );
}