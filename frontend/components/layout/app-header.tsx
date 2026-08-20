"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

// The bar carries the short section name — the same word the sidebar uses —
// while each page body opens with its own fuller heading ("Dashboard" up here,
// "Dashboard Overview" down there). Keeping the two distinct is what stops the
// bar from reading as a duplicate of the page title.
const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  "sql-servers": "SQL Servers",
  databases: "Databases",
  "database-tables": "Tables",
  users: "Users",
  permissions: "Permissions",
  "audit-logs": "Audit Logs",
  settings: "Settings",
};

function getSectionTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const current = segments.at(-1) ?? "";
  // Unknown routes fall back to a de-slugified segment rather than rendering
  // an empty bar, which would look broken.
  return SECTION_TITLES[current] ?? current.replace(/-/g, " ");
}

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    // No breadcrumb, no status pill, no state toggle — so the title is packed
    // left with a gap rather than justified against an empty right-hand group.
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-5 md:px-7">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="-ml-1 shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <span className="truncate text-[15px] font-bold text-foreground">
        {getSectionTitle(pathname)}
      </span>
    </header>
  );
}
