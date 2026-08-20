"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Fixed 260px rail, everything else scrolls beside it. The rail is `fixed`
 * rather than a flex sibling so that the long tables scroll under a navigation
 * that never leaves the viewport.
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Syncing with the router's pathname (an external signal), not deriving
    // state from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 z-30 hidden w-65 md:flex md:flex-col">
        <AppSidebar className="h-full" />
      </aside>

      <div
        aria-hidden="true"
        onClick={() => setIsMobileSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
          isMobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-65 max-w-[80vw] shadow-2xl transition-transform duration-300 md:hidden",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebar className="h-full" onClose={() => setIsMobileSidebarOpen(false)} />
      </aside>

      <div className="flex min-h-screen flex-col md:pl-65">
        <AppHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 px-5 pt-7 pb-15 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
