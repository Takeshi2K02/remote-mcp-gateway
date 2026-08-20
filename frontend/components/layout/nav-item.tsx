"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function NavItem({ href, label, icon: Icon, onClick }: NavItemProps) {
  const pathname = usePathname();

  // Dashboard is matched exactly: every route starts with "/", so a prefix
  // test there would light it up on every page.
  const isActive =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.75 rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" strokeWidth={1.7} />
      <span>{label}</span>
    </Link>
  );
}
