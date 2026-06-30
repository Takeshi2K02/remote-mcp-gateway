"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  onClick?: () => void;
}

export function NavItem({ href, label, icon: Icon, badge, onClick }: NavItemProps) {
  const pathname = usePathname();
  
  // Check if link is active
  const isActive = href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black",
        isActive
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
            isActive
              ? "text-primary dark:text-primary-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span>{label}</span>
      </div>

      {badge !== undefined && (
        <span
          className={cn(
            "inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full min-w-5 h-5 transition-colors",
            isActive
              ? "bg-primary text-primary-foreground dark:bg-primary-foreground dark:text-primary"
              : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
