import { PageHeader } from "@/components/layout/page-header";
import { AppearanceCard } from "@/features/settings/components/appearance-card";
import { SessionSecurityCard } from "@/features/settings/components/session-security-card";

export default function SettingsPage() {
  return (
    <div className="max-w-180">
      <PageHeader
        title="Settings"
        description="Manage preferences for your admin console session."
      />
      <div className="flex flex-col gap-4">
        <AppearanceCard />
        <SessionSecurityCard />
      </div>
    </div>
  );
}
